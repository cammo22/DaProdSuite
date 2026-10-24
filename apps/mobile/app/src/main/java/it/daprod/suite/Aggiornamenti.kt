package it.daprod.suite

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

object Aggiornamenti {
    private const val RELEASE="https://api.github.com/repos/cammo22/DaProdSuite/releases/latest"
    private val client=OkHttpClient.Builder().connectTimeout(10,TimeUnit.SECONDS).readTimeout(90,TimeUnit.SECONDS).build()
    data class Nuova(val versione:String,val url:String,val bytes:Long,val digest:String?)
    suspend fun cerca(c:Context):Nuova? = withContext(Dispatchers.IO) {
        client.newCall(Request.Builder().url(RELEASE).build()).execute().use { r ->
            check(r.isSuccessful){"Controllo aggiornamenti non disponibile (${r.code})"}
            val release=JSONObject(r.body?.string() ?: error("Release vuota"))
            val version=release.getString("tag_name").removePrefix("v")
            if(codice(version)<=installedCode(c))return@withContext null
            val assets=release.getJSONArray("assets")
            for(i in 0 until assets.length()) {
                val a=assets.getJSONObject(i);val name=a.getString("name")
                if(name.endsWith(".apk") && (name.startsWith("DaProdGiochi-") || name.startsWith("DaProdSuite-"))) {
                    val url=a.getString("browser_download_url")
                    require(url.startsWith("https://github.com/cammo22/DaProdSuite/releases/download/") || url.startsWith("https://github.com/cammo22/DaProdGiochi/releases/download/"))
                    val size=a.getLong("size");require(size in 1..150L*1024*1024)
                    return@withContext Nuova(version,url,size,a.optString("digest").takeIf { it.matches(Regex("sha256:[a-fA-F0-9]{64}")) })
                }
            }
            error("La release non contiene ancora l'APK")
        }
    }
    internal fun codice(v:String):Long {
        val m=Regex("^(\\d+)\\.(\\d+)\\.(\\d+)$").matchEntire(v) ?: return 0
        val p=m.groupValues.drop(1).map { it.toLong() };require(p[0]<10000 && p[1]<100 && p[2]<100)
        return p[0]*10000+p[1]*100+p[2]
    }
    @Suppress("DEPRECATION")
    private fun installedCode(c:Context):Long=c.packageManager.getPackageInfo(c.packageName,0).let { if(Build.VERSION.SDK_INT>=28)it.longVersionCode else it.versionCode.toLong() }
    @Suppress("DEPRECATION")
    suspend fun scarica(c:Context,n:Nuova,progress:(Int)->Unit):File=withContext(Dispatchers.IO) {
        val dir=File(c.cacheDir,"aggiornamenti").apply { mkdirs() }
        val partial=File(dir,"aggiornamento.part");val ready=File(dir,"DaProdGiochi.apk")
        try {
            val digest=MessageDigest.getInstance("SHA-256")
            client.newCall(Request.Builder().url(n.url).build()).execute().use { r ->
                check(r.isSuccessful){"Scaricamento non riuscito (${r.code})"}
                (r.body ?: error("APK vuoto")).byteStream().use { input ->partial.outputStream().use { output ->
                    val buffer=ByteArray(65536);var total=0L
                    while(true){val count=input.read(buffer);if(count<0)break;total+=count;check(total<=n.bytes){"APK troppo grande"};digest.update(buffer,0,count);output.write(buffer,0,count);progress((total*100/n.bytes).toInt())}
                    check(total==n.bytes){"Scaricamento incompleto"}
                } }
            }
            val sha=digest.digest().joinToString(""){"%02x".format(it)}
            if(n.digest!=null)check("sha256:$sha".equals(n.digest,true)){"Verifica del file non riuscita"}
            val pm=c.packageManager
            val archive=pm.getPackageArchiveInfo(partial.absolutePath,PackageManager.GET_SIGNATURES) ?: error("APK non valido")
            val current=pm.getPackageInfo(c.packageName,PackageManager.GET_SIGNATURES)
            check(archive.packageName==c.packageName){"L'APK appartiene a un'altra app"}
            val code=if(Build.VERSION.SDK_INT>=28)archive.longVersionCode else archive.versionCode.toLong()
            check(code>installedCode(c) && code==codice(n.versione)){"Versione APK non valida"}
            val before=current.signatures?.map { it.toCharsString() }?.toSet()
            val after=archive.signatures?.map { it.toCharsString() }?.toSet()
            check(!before.isNullOrEmpty() && before==after){"Firma diversa: installazione interrotta, profili conservati"}
            if(ready.exists())check(ready.delete());check(partial.renameTo(ready));ready
        }catch(e:Exception){partial.delete();throw e}
    }
    /** Chiamata solo dal pulsante Installa: non concede alcun permesso. */
    fun installa(c:Context,file:File){
        val uri=FileProvider.getUriForFile(c,"${c.packageName}.file",file)
        c.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
    }
}
