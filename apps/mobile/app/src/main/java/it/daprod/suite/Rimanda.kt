package it.daprod.suite

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import it.daprod.suite.data.Profili
import it.daprod.suite.net.GatewayClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * «Rimanda», dal tasto dentro la notifica.
 *
 * ## Cosa è stato chiesto, il 7 settembre 2026
 *
 * > «Anche se capita che un prompt vada in esito "non fatto", notifichiamolo,
 * > perché magari diciamo "riprova tra poco" e rimanda la richiesta.»
 *
 * La notifica che dice cos'è andato storto c'era già dalla 1.2.2. Mancava la
 * seconda metà: **poterlo rifare da lì**. Prima bisognava aprire l'app, andare
 * nella Fila, trovare la riga e premere «rifallo» — quattro gesti per rifare una
 * cosa che il telefono sapeva già qual era.
 *
 * ## Perché un receiver e non l'app che si apre
 *
 * Perché aprire l'app per premere un tasto e richiuderla è il giro lungo. Qui il
 * tocco fa la cosa e basta: la richiesta riparte, la notifica sparisce, e ne
 * arriva una che dice com'è andata. L'app resta chiusa, che è dove era.
 *
 * ⚠ **La richiesta nuova è nuova davvero**, con un numero suo: la rotta
 * `/richieste/:id/rifai` non riscrive quella di prima. Un lavoro andato storto è
 * un fatto, e cancellarlo vorrebbe dire non capire più cosa è successo quando —
 * il perché per intero sta nel commento di quella rotta, in `server.ts`.
 */
class Rimanda : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val richiesta = intent.getStringExtra(EXTRA_RICHIESTA) ?: return
        val profiloId = intent.getStringExtra(EXTRA_PROFILO) ?: return
        val notifica = intent.getIntExtra(EXTRA_NOTIFICA, 0)

        // Via subito, prima ancora di sapere com'è andata: il tasto è stato
        // premuto, e una notifica che resta lì dopo che l'hai toccata sembra
        // una che non ha funzionato.
        if (notifica != 0) NotificationManagerCompat.from(context).cancel(notifica)

        val persona = Profili.tutti(context).firstOrNull { it.id == profiloId } ?: return

        /**
         * ⚠ **`goAsync` e non un `launch` e via.**
         *
         * Un receiver che fa partire una coroutine e torna subito viene
         * considerato finito da Android, e il processo può essere ucciso a metà
         * chiamata: il tocco non farebbe niente, e non lo saprebbe nessuno.
         * Con `goAsync` il sistema aspetta il `finish()`, che qui arriva quando
         * la richiesta è partita davvero.
         */
        val aspetta = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            val fatto = try {
                GatewayClient(persona.base, persona.token).rimandaRichiesta(richiesta)
            } catch (_: Exception) {
                false
            }
            // Si dice com'è andata, in tutti e due i casi. Un tasto premuto che
            // non risponde niente è indistinguibile da un tasto rotto — e qui
            // l'app è chiusa, quindi non c'è nessun altro posto dove guardare.
            Notifiche.mostraComunque(
                context,
                persona.nome,
                if (fatto) {
                    "È ripartita. La ritrovi nella Fila col numero nuovo."
                } else {
                    "Non sono riuscito a rimandarla: il computer non risponde. Riprova quando è acceso."
                },
            )
            aspetta.finish()
        }
    }

    companion object {
        const val AZIONE = "it.daprod.suite.RIMANDA"
        const val EXTRA_RICHIESTA = "richiesta"
        const val EXTRA_PROFILO = "profilo"
        const val EXTRA_NOTIFICA = "notifica"
    }
}
