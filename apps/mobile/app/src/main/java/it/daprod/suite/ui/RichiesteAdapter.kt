package it.daprod.suite.ui

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import it.daprod.suite.R
import it.daprod.suite.data.Richiesta
import it.daprod.suite.databinding.ItemRichiestaBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * La lista delle richieste.
 *
 * Una riga mostra cosa si è chiesto, a che punto è, e — quando c'è un file
 * pronto — il tasto per portarselo nel telefono. Quello è il momento in cui
 * l'app smette di essere un telecomando e diventa utile da sola.
 */
class RichiesteAdapter(
    private val elementi: MutableList<Richiesta>,
    /** Cosa fare quando si preme «Scarica» su una richiesta pronta. */
    private val onScarica: (Richiesta) -> Unit,
) : RecyclerView.Adapter<RichiesteAdapter.Voce>() {

    class Voce(val binding: ItemRichiestaBinding) : RecyclerView.ViewHolder(binding.root)

    private val quando = SimpleDateFormat("d MMM, HH:mm", Locale.ITALIAN)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Voce =
        Voce(ItemRichiestaBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: Voce, position: Int) {
        val r = elementi[position]
        val b = holder.binding

        b.voceTitolo.text = if (r.eOffline) r.tipo else "${r.tipo} · ${r.app}"
        b.voceStato.text = r.etichettaStato
        b.vocePrompt.text = r.testo

        b.voceQuando.text = buildString {
            append(quando.format(Date(r.quando)))
            if (!r.eOffline && r.daNome.isNotBlank()) append(" · da ${r.daNome}")
            r.motivoScarto?.let { append(" · $it") }
            if (r.eScaricabile && r.risultatoBytes > 0) append(" · ${pesa(r.risultatoBytes)}")
        }

        b.voceStato.setTextColor(
            holder.itemView.context.getColor(
                when (r.stato) {
                    "pronta" -> R.color.verde
                    "scartata", "scaduta" -> R.color.rosso
                    else -> R.color.accento
                },
            ),
        )

        b.btnScarica.visibility = if (r.eScaricabile) View.VISIBLE else View.GONE
        b.btnScarica.setOnClickListener { onScarica(r) }
    }

    override fun getItemCount() = elementi.size

    fun sostituisci(nuovi: List<Richiesta>) {
        elementi.clear()
        elementi.addAll(nuovi)
        notifyDataSetChanged()
    }

    private fun pesa(b: Long): String = when {
        b >= 1_073_741_824 -> String.format(Locale.ITALIAN, "%.1f GB", b / 1_073_741_824.0)
        b >= 1_048_576 -> String.format(Locale.ITALIAN, "%.1f MB", b / 1_048_576.0)
        else -> "${b / 1024} KB"
    }
}
