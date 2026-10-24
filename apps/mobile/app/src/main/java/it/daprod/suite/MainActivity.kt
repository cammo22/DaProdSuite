package it.daprod.suite

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.OnBackPressedCallback
import androidx.lifecycle.lifecycleScope
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import it.daprod.suite.data.Profili
import it.daprod.suite.data.Profilo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {
    private lateinit var content:FrameLayout
    private lateinit var update:Button
    private var web:WebView?=null
    private var currentBase:String?=null
    private var checking=false
    private var downloading=false
    private var lastCheck=0L
    private var generation=0
    private val client=OkHttpClient.Builder().connectTimeout(4,TimeUnit.SECONDS).readTimeout(5,TimeUnit.SECONDS).build()
    private val scanner=registerForActivityResult(ScanContract()){r->r.contents?.let { showInvite(it) }}
    private val Int.dp get()=(this*resources.displayMetrics.density).toInt()
    private fun notice(s:String)=Toast.makeText(this,s,Toast.LENGTH_LONG).show()
    private fun heading(s:String)=TextView(this).apply {text=s;textSize=25f;setTextColor(Color.rgb(214,250,116));setPadding(24,28,24,28)}
    override fun onCreate(savedInstanceState:Bundle?) {
        super.onCreate(savedInstanceState)
        val root=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setBackgroundColor(Color.rgb(18,21,21))}
        WindowCompat.setDecorFitsSystemWindows(window,false)
        ViewCompat.setOnApplyWindowInsetsListener(root){v,i->val bars=i.getInsets(WindowInsetsCompat.Type.systemBars());v.setPadding(bars.left,bars.top,bars.right,bars.bottom);i}
        val bar=LinearLayout(this).apply {setPadding(12,6,12,6)}
        bar.addView(Button(this).apply {text="◈ Profili";setOnClickListener {profiles()}},LinearLayout.LayoutParams(0,52.dp,1f))
        bar.addView(Button(this).apply {text="↻ Riprova";setOnClickListener {Profili.attivo(this@MainActivity)?.let {open(it)} ?: profiles()}},LinearLayout.LayoutParams(0,52.dp,1f))
        root.addView(bar);update=Button(this).apply {visibility=View.GONE};root.addView(update)
        content=FrameLayout(this);root.addView(content,LinearLayout.LayoutParams(-1,0,1f));setContentView(root)
        onBackPressedDispatcher.addCallback(this,object:OnBackPressedCallback(true){override fun handleOnBackPressed(){if(web?.canGoBack()==true)web?.goBack() else profiles()}})
        // Conserva le preferenze della Suite; non cancella mai il conto su un errore di rete.
        Profili.attivo(this)?.let {open(it)} ?: profiles();checkUpdates(false)
    }
    override fun onResume(){super.onResume();if(::content.isInitialized && System.currentTimeMillis()-lastCheck>60_000)checkUpdates(false)}
    private fun profiles() {
        generation++;web?.destroy();web=null;currentBase=null;content.removeAllViews()
        val list=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setPadding(24,12,24,24)}
        list.addView(heading("DaProdGiochi\nScegli chi gioca."))
        list.addView(TextView(this).apply {text="La tua sala privata, collegata con Tailscale. Tieni premuto un profilo per aggiornare l'indirizzo del PC.";setTextColor(Color.LTGRAY);setPadding(8,0,8,24)})
        for(p in Profili.tutti(this))list.addView(Button(this).apply {text=p.nome+" · "+p.computer;setOnClickListener {Profili.scegli(this@MainActivity,p.id);open(p)};setOnLongClickListener {changeBase(p);true}})
        list.addView(Button(this).apply {text="＋ Inquadra un invito QR";setOnClickListener {scanner.launch(ScanOptions().setDesiredBarcodeFormats(ScanOptions.QR_CODE).setPrompt("Inquadra l'invito della sala").setBeepEnabled(false).setOrientationLocked(false))}})
        list.addView(Button(this).apply {text="Incolla un invito";setOnClickListener {val input=EditText(this@MainActivity);AlertDialog.Builder(this@MainActivity).setTitle("Invito dalla sala").setView(input).setPositiveButton("Apri"){_,_->showInvite(input.text.toString())}.setNegativeButton("Annulla",null).show()}})
        list.addView(Button(this).apply {text="Controlla aggiornamenti";setOnClickListener {checkUpdates(true)}})
        content.addView(ScrollView(this).apply {addView(list)})
    }
    private fun validBase(value:String):String? {
        val u=Uri.parse(value)
        if(u.scheme!="https" || u.host.isNullOrBlank() || u.userInfo!=null)return null
        return "https://${u.encodedAuthority}"
    }
    private fun changeBase(p:Profilo) {
        val input=EditText(this).apply {hint="https://nome-pc.rete.ts.net"}
        AlertDialog.Builder(this).setTitle("Indirizzo della nuova sala").setMessage("Usa l'indirizzo HTTPS mostrato sul tuo PC. Il profilo e il token saranno conservati.")
            .setView(input).setPositiveButton("Salva"){_,_->val base=validBase(input.text.toString().trim());if(base==null)notice("Serve l'indirizzo HTTPS della sala")else{val next=p.copy(base=base,basi=listOf(base)+p.basi);Profili.salva(this,next);open(next)}}.setNegativeButton("Annulla",null).show()
    }
    private fun showInvite(value:String) {
        val uri=Uri.parse(value.trim());val base=validBase(value.trim())
        val code=Uri.parse("https://invite.invalid/?"+uri.fragment.orEmpty()).getQueryParameter("invite")
        if(base==null || code.isNullOrBlank()){notice("Serve un invito HTTPS DaProdGiochi.");return}
        val name=EditText(this).apply {hint="Il tuo nome in sala";setSingleLine()}
        AlertDialog.Builder(this).setTitle("Entra nella sala").setMessage("PC: $base\nConferma se è la sala che ti ha invitato.").setView(name)
            .setPositiveButton("Entra"){_,_->pair(base,code,name.text.toString().trim())}.setNegativeButton("Annulla",null).show()
    }
    private fun pair(base:String,code:String,name:String) {
        if(name.isBlank() || name.length>40){notice("Scegli un nome da 1 a 40 caratteri.");return}
        lifecycleScope.launch {
            try {
                val data=withContext(Dispatchers.IO){
                    val body=JSONObject().put("code",code).put("name",name).toString().toRequestBody("application/json".toMediaType())
                    client.newCall(Request.Builder().url("$base/api/pair").post(body).build()).execute().use {r->val json=JSONObject(r.body?.string() ?: "{}");check(r.isSuccessful){json.optString("error","Collegamento non riuscito")};json}
                }
                val p=data.getJSONObject("player")
                val profile=Profilo(UUID.randomUUID().toString(),p.getString("name"),base,listOf(base),data.getString("token"),"ospite","DaProdGiochi",ultimoUso=System.currentTimeMillis())
                Profili.salva(this@MainActivity,profile);open(profile)
            }catch(e:Exception){notice(e.message ?: "Il PC non risponde. Controlla Tailscale.")}
        }
    }
    @SuppressLint("SetJavaScriptEnabled")
    private fun open(p:Profilo) {
        val ticket=++generation;web?.destroy();web=null;content.removeAllViews();content.addView(heading("Cerco la tua sala…"))
        val bases=(listOf(p.base)+p.basi).distinct().mapNotNull {validBase(it)}
        if(bases.isEmpty()){profiles();changeBase(p);return}
        lifecycleScope.launch {
            val base=withContext(Dispatchers.IO){bases.firstOrNull {candidate->try{client.newCall(Request.Builder().url("$candidate/api/health").build()).execute().use {r->r.isSuccessful && JSONObject(r.body?.string() ?: "{}").optString("app")=="DaProdGiochi"}}catch(_:Exception){false}}}
            if(ticket!=generation || isFinishing || isDestroyed)return@launch
            if(base==null){content.removeAllViews();content.addView(heading("La sala non risponde.\nAccendi il PC e Tailscale, poi tocca Riprova.\nIl profilo è ancora qui."));return@launch}
            Profili.ricordaBase(this@MainActivity,p.id,base);currentBase=base;content.removeAllViews()
            val w=WebView(this@MainActivity);web=w;w.setBackgroundColor(Color.rgb(18,21,21))
            w.settings.javaScriptEnabled=true;w.settings.domStorageEnabled=true;w.settings.allowFileAccess=false;w.settings.allowContentAccess=false
            w.settings.setSupportMultipleWindows(false);WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
            w.webViewClient=object:WebViewClient(){override fun shouldOverrideUrlLoading(view:WebView,request:WebResourceRequest):Boolean {
                if(validBase(request.url.toString())==currentBase)return false
                if(request.isForMainFrame && request.url.scheme=="https")startActivity(Intent(Intent.ACTION_VIEW,request.url));return true
            }}
            content.addView(w,FrameLayout.LayoutParams(-1,-1));w.loadUrl("$base/#token="+Uri.encode(p.token))
        }
    }
    private fun checkUpdates(manual:Boolean){
        if(checking)return;checking=true;lastCheck=System.currentTimeMillis()
        lifecycleScope.launch {try{val next=Aggiornamenti.cerca(this@MainActivity);if(next==null){if(manual)notice("Sei già all'ultima versione.")}else{update.visibility=View.VISIBLE;update.text="Aggiorna DaProdGiochi alla ${next.versione}";update.setOnClickListener {confirmUpdate(next)}}}catch(e:Exception){if(manual)notice(e.message ?: "Controllo aggiornamenti non riuscito.")}finally{checking=false}}
    }
    private fun confirmUpdate(next:Aggiornamenti.Nuova){
        if(downloading)return
        AlertDialog.Builder(this).setTitle("Aggiornamento ${next.versione}").setMessage("Scarica e verifica la nuova versione. Profili e salvataggi restano sul telefono.")
            .setPositiveButton("Scarica"){_,_->download(next)}.setNegativeButton("Più tardi",null).show()
    }
    private fun download(next:Aggiornamenti.Nuova){
        if(downloading)return
        downloading=true;update.isEnabled=false
        lifecycleScope.launch {try{
            val file=Aggiornamenti.scarica(this@MainActivity,next){p->runOnUiThread{update.text="Scarico aggiornamento · $p%"}}
            AlertDialog.Builder(this@MainActivity).setTitle("Aggiornamento verificato").setMessage("Android ti chiederà di confermare l'installazione.")
                .setPositiveButton("Installa"){_,_->
                    if(packageManager.canRequestPackageInstalls())Aggiornamenti.installa(this@MainActivity,file)
                    else AlertDialog.Builder(this@MainActivity).setTitle("Autorizzazione Android").setMessage("Per installare l'APK devi autorizzare questa app nelle impostazioni. Dopo, tocca di nuovo Aggiorna.")
                        .setPositiveButton("Apri impostazioni"){_,_->startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:$packageName")))}.setNegativeButton("Annulla",null).show()
                }.setNegativeButton("Più tardi",null).show()
        }catch(e:Exception){notice(e.message ?: "Aggiornamento non riuscito: riprova.")}finally{downloading=false;update.isEnabled=true;update.text="Aggiorna alla ${next.versione}"}}
    }
    override fun onDestroy(){generation++;web?.destroy();super.onDestroy()}
}
