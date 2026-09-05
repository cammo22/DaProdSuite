package it.daprod.suite.net

import android.content.Context
import android.net.wifi.WifiManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException

/**
 * I computer di casa, trovati senza sapere niente di loro.
 *
 * ## Il difetto che cura
 *
 * Fino alla 0.8.2 per collegarsi bisognava **avere un codice**: qualcuno apriva
 * DaProdConnessione sul PC, premeva «Invita», e dettava otto cifre. Funziona,
 * ma pretende che le due persone siano nella stessa stanza nello stesso
 * momento — e che una delle due sappia già dove guardare.
 *
 * Chiesto il 5 settembre 2026: «all'avvio la creazione del profilo, e
 * automaticamente alla fine si vede in automatico tutti i pc collegati e si
 * decide a quale collegarsi».
 *
 * ## Come funziona, in quattro righe
 *
 * 1. si apre una porta UDP qualunque e si grida **«ehi»** al gruppo multicast
 *    `239.90.90.90:8791`, al broadcast generale e a quello della propria rete;
 * 2. ogni computer con la suite accesa risponde **in faccia** — sulla porta da
 *    cui è arrivata la domanda — dicendo come si chiama e dove bussargli;
 * 3. si continua a chiedere ogni due secondi finché la schermata è aperta: un
 *    computer acceso mezzo secondo dopo deve comparire da solo;
 * 4. le risposte si accumulano in una mappa: chi risponde due volte non
 *    compare due volte.
 *
 * **Perché non NsdManager.** Perché il gateway non parla mDNS: parla questo,
 * che è un JSON dentro un datagramma. Farlo parlare mDNS vorrebbe dire una
 * libreria in più in Node (vedi `packages/gateway/src/rete.ts`), e questo file
 * al posto suo sono quaranta righe che non si aggiornano mai.
 *
 * **Il lucchetto del multicast.** Su Android il wifi, per risparmiare batteria,
 * butta via i pacchetti che non sono indirizzati al telefono. `MulticastLock`
 * gli dice di non farlo. Serve al multicast e al broadcast; la risposta
 * unicast arriverebbe comunque, ma il lucchetto non costa niente e toglie di
 * mezzo una differenza fra un telefono e l'altro.
 */
object Scoperta {

    /** Il gruppo e la porta: gli stessi di `rete.ts`, e non si toccano da soli. */
    private const val GRUPPO = "239.90.90.90"
    private const val PORTA = 8791

    /** Un computer sentito sulla rete. */
    data class Computer(
        val id: String,
        val nome: String,
        val versione: String,
        /** Gli indirizzi su cui bussare, dal più promettente. */
        val basi: List<String>,
        /** Da dove è arrivata la risposta: questo funziona di sicuro. */
        val visto: String,
        val porta: Int,
        /** Falso se quel computer ha la connessione spenta: non farebbe entrare. */
        val apre: Boolean,
    ) {
        /**
         * Dove bussare per primo.
         *
         * L'indirizzo da cui è arrivata la risposta batte quelli annunciati:
         * quelli sono *tutti* gli indirizzi di quel computer — Tailscale, il
         * tunnel, le schede virtuali — e da questa rete, adesso, funziona per
         * certo solo quello da cui abbiamo appena ricevuto un pacchetto.
         */
        val doveBussare: String get() = "http://$visto:$porta"

        /** Tutti gli indirizzi da tenere per dopo, con quello sicuro davanti. */
        val tutti: List<String> get() = (listOf(doveBussare) + basi).distinct()
    }

    /**
     * Ascolta per un po' e torna chi si è fatto sentire.
     *
     * `quantoMs` è quanto si resta in ascolto in tutto; ogni due secondi si
     * richiede. Non solleva mai: una rete che non lascia passare il multicast è
     * un motivo per non trovare nessuno, non per far morire l'app — chi non
     * trova niente vede la schermata che spiega come fare col codice.
     */
    suspend fun cerca(contesto: Context, quantoMs: Long = 4_000): List<Computer> =
        withContext(Dispatchers.IO) {
            val trovati = LinkedHashMap<String, Computer>()
            val wifi = contesto.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val lucchetto = try {
                wifi?.createMulticastLock("daprod-scoperta")?.apply {
                    setReferenceCounted(true)
                    acquire()
                }
            } catch (_: Exception) {
                null
            }

            var socket: DatagramSocket? = null
            try {
                socket = DatagramSocket().apply {
                    broadcast = true
                    // Corto: il ciclo qui sotto conta i millisecondi da solo, e
                    // un timeout lungo vorrebbe dire non poter richiedere.
                    soTimeout = 300
                }
                val ehi = """{"t":"ehi","v":1}""".toByteArray()
                val destinazioni = destinazioni(contesto)

                val fine = System.currentTimeMillis() + quantoMs
                var prossimaDomanda = 0L
                val buffer = ByteArray(4096)

                while (System.currentTimeMillis() < fine) {
                    val adesso = System.currentTimeMillis()
                    if (adesso >= prossimaDomanda) {
                        prossimaDomanda = adesso + 2_000
                        for (dove in destinazioni) {
                            try {
                                socket.send(DatagramPacket(ehi, ehi.size, dove, PORTA))
                            } catch (_: Exception) {
                                // Una strada chiusa non chiude le altre.
                            }
                        }
                    }
                    val pacco = DatagramPacket(buffer, buffer.size)
                    try {
                        socket.receive(pacco)
                    } catch (_: SocketTimeoutException) {
                        continue
                    } catch (_: Exception) {
                        break
                    }
                    leggi(pacco)?.let { trovati[it.id] = it }
                }
            } catch (_: Exception) {
                // Niente socket: si torna quello che si è trovato, cioè niente.
            } finally {
                try {
                    socket?.close()
                } catch (_: Exception) {
                    // già chiuso
                }
                try {
                    lucchetto?.release()
                } catch (_: Exception) {
                    // già rilasciato
                }
            }
            trovati.values.toList()
        }

    /**
     * Dove gridare «ehi».
     *
     * Tre strade, e su qualche rete di casa ne funziona una sola:
     *
     * - il **gruppo multicast**, che è quello giusto e passa quasi sempre;
     * - il **broadcast generale**, per le wifi che filtrano il multicast;
     * - il **broadcast della propria rete** (`192.168.1.255`), per i router che
     *   buttano via il precedente.
     */
    private fun destinazioni(contesto: Context): List<InetAddress> {
        val fuori = mutableListOf<InetAddress>()
        try {
            fuori.add(InetAddress.getByName(GRUPPO))
        } catch (_: Exception) {
            // senza multicast restano i broadcast
        }
        try {
            fuori.add(InetAddress.getByName("255.255.255.255"))
        } catch (_: Exception) {
            // idem
        }
        for (bc in broadcastDelleSchede()) {
            try {
                fuori.add(InetAddress.getByName(bc))
            } catch (_: Exception) {
                // una scheda in meno
            }
        }
        return fuori.distinct()
    }

    /** `192.168.1.42/24` → `192.168.1.255`, per ogni scheda del telefono. */
    private fun broadcastDelleSchede(): List<String> {
        val fuori = mutableListOf<String>()
        try {
            val schede = java.net.NetworkInterface.getNetworkInterfaces() ?: return fuori
            for (scheda in schede) {
                if (!scheda.isUp || scheda.isLoopback) continue
                for (indirizzo in scheda.interfaceAddresses) {
                    val bc = indirizzo.broadcast ?: continue
                    fuori.add(bc.hostAddress ?: continue)
                }
            }
        } catch (_: Exception) {
            // Su qualche telefono l'elenco delle schede non si legge: pazienza.
        }
        return fuori.distinct()
    }

    /**
     * Legge una risposta, o `null` se non è roba nostra.
     *
     * Su questa porta può arrivare di tutto — un altro programma, una scansione
     * di rete, un pacchetto malformato — e niente di quello che arriva qui
     * decide qualcosa: al massimo fa comparire una riga in un elenco. Quindi si
     * legge in modo difensivo e, al primo dubbio, si butta via in silenzio.
     */
    private fun leggi(pacco: DatagramPacket): Computer? {
        return try {
            val testo = String(pacco.data, pacco.offset, pacco.length)
            val o = JSONObject(testo)
            if (o.optInt("v") != 1 || o.optString("t") != "sono") return null
            val id = o.optString("id")
            if (id.isBlank()) return null
            val da = pacco.address?.hostAddress ?: return null
            val arr = o.optJSONArray("basi")
            val basi = buildList {
                for (i in 0 until (arr?.length() ?: 0)) {
                    arr?.optString(i)?.takeIf { it.isNotBlank() }?.let { add(it) }
                }
            }
            Computer(
                id = id,
                nome = o.optString("nome").ifBlank { "Un computer" },
                versione = o.optString("versione"),
                basi = basi,
                visto = da,
                porta = o.optInt("porta", 8790),
                apre = o.optBoolean("apre", true),
            )
        } catch (_: Exception) {
            null
        }
    }
}
