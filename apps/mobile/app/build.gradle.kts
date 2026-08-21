plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "it.daprod.suite"
    compileSdk = 34

    defaultConfig {
        applicationId = "it.daprod.suite"
        minSdk = 26
        targetSdk = 34
        // Segue la versione della suite: l'app e il gateway si tengono per mano,
        // e sapere che numero ha in mano il telefono serve quando qualcosa non torna.
        versionCode = 6
        versionName = "0.5.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Firmata con la chiave di **debug**, e va detto: non è la chiave di
            // nessuno, è quella che Android genera uguale su ogni computer.
            //
            // Serve a una cosa sola: rendere l'APK installabile. Senza una
            // firma Android rifiuta di installarlo, e con `assembleRelease`
            // nudo esce un `app-release-unsigned.apk` che non serve a niente.
            //
            // Quello che si guadagna rispetto all'APK di debug è la cosa che
            // conta: **non è `debuggable`**. Un APK di debug lascia che
            // qualunque programma sul telefono si attacchi al processo, e
            // dentro quel processo c'è il token che apre il PC di casa.
            //
            // Per una chiave vera serve un keystore, che è roba di Cammo: la
            // password non può stare in un repo pubblico, e la chiave che firma
            // un'app non la genera qualcun altro al posto suo.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    // La lista delle richieste. Arriverebbe comunque con material, ma una cosa
    // che si usa direttamente si dichiara: un aggiornamento di material non
    // deve poterla portare via.
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.6")
    implementation("androidx.activity:activity-ktx:1.9.2")

    // Rete: OkHttp + coroutine per le chiamate al gateway.
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")

    // Scanner QR per l'accoppiamento.
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")

    // Lavori in background: il polling che porta le notifiche anche ore dopo.
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}