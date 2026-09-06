package it.daprod.suite.net

import java.net.Inet4Address
import java.net.NetworkInterface

/**
 * Le schede di rete del telefono, per il ponte Tailscale.
 *
 * ⚠ **Perche' esiste questa classe.** Da Android 11 un'app non puo' leggere la
 * tabella di routing, e il `net` di Go la legge da li': dentro l'app,
 * `net.Interfaces()` risponde `netlinkrib: permission denied` e Tailscale non
 * parte proprio. E' l'issue 2293 di Tailscale, ed e' un muro del sistema, non
 * un difetto.
 *
 * Java pero' le schede le vede: `NetworkInterface.getNetworkInterfaces()` ci
 * arriva per un'altra strada, che Android lascia aperta. Quindi le elenca
 * questa classe e le passa di la'.
 *
 * Il formato lo descrive `Reti.Elenco` in `tailponte/reti.go`. Regola sola:
 * **una riga per scheda, pezzi separati da `;`** — e piatto, perche' ogni
 * salto fra Kotlin e Go costa, e Tailscale le schede se le richiede spesso.
 */
class ReteDelTelefono : tailponte.Reti {

    override fun elenco(): String {
        val fuori = StringBuilder()
        try {
            val schede = NetworkInterface.getNetworkInterfaces() ?: return ""
            for (s in schede) {
                val bandiere = StringBuilder()
                try {
                    if (s.isUp) bandiere.append('u')
                    if (s.isLoopback) bandiere.append('l')
                    if (s.isPointToPoint) bandiere.append('p')
                    if (s.supportsMulticast()) bandiere.append('m')
                } catch (e: Exception) {
                    // Una scheda che non risponde alle domande si salta: e'
                    // sempre meglio di un elenco che non arriva.
                    continue
                }

                val indirizzi = s.interfaceAddresses.mapNotNull { a ->
                    val ip = a.address ?: return@mapNotNull null
                    val quanti =
                        if (a.networkPrefixLength.toInt() > 0) a.networkPrefixLength.toInt()
                        else if (ip is Inet4Address) 32 else 128
                    /*
                     * `hostAddress` di un IPv6 locale al collegamento porta con
                     * se' il nome della scheda dopo un `%` — `fe80::1%wlan0`.
                     * Go non se lo aspetta li' dentro e la riga finirebbe
                     * buttata: si toglie qui, dove si vede perche'.
                     */
                    val testo = (ip.hostAddress ?: return@mapNotNull null).substringBefore('%')
                    "$testo/$quanti"
                }

                val mtu = try { s.mtu } catch (e: Exception) { 1500 }
                fuori.append(s.name).append(';')
                    .append(s.index).append(';')
                    .append(if (mtu > 0) mtu else 1500).append(';')
                    .append(bandiere).append(';')
                    .append(indirizzi.joinToString(","))
                    .append('\n')
            }
        } catch (e: Exception) {
            // Senza elenco Tailscale crede di stare su una macchina senza rete
            // e passa da un relay: piu' lento, e vivo. Meglio di non partire.
            return ""
        }
        return fuori.toString()
    }
}
