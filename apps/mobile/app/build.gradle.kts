plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "it.daprod.suite"
    compileSdk = 34

    /*
     * La chiave con cui si firma l'APK da scaricare.
     *
     * **Non è un segreto, e non deve esserlo.** Sta nel repository con la sua
     * password scritta qui sotto, e il motivo è preciso: Android rifiuta di
     * aggiornare un'app se la firma non combacia con quella già installata. Con
     * la chiave di debug — che ogni computer si genera per conto suo, e il
     * runner della CI pure — ogni release avrebbe una firma diversa, e
     * l'aggiornamento automatico dell'app **non potrebbe funzionare**: ogni
     * volta bisognerebbe disinstallare e reinstallare.
     *
     * Cosa non protegge: chiunque abbia questo file può firmare un finto
     * «DaProd Suite». È vero, ed è vero **anche senza**: la chiave di debug di
     * Android è pubblica e universale, e prima si usava quella. Questo file non
     * aggiunge un rischio, toglie un fastidio.
     *
     * Il giorno che la suite dovesse andare su un negozio, quella sarà una
     * chiave vera, segreta, e custodita da chi la pubblica — non questa.
     */
    signingConfigs {
        create("sideload") {
            storeFile = file("../firma-sideload.jks")
            storePassword = "daprod-sideload"
            keyAlias = "daprod"
            keyPassword = "daprod-sideload"
        }
    }

    defaultConfig {
        applicationId = "it.daprod.suite"
        minSdk = 26
        targetSdk = 34
        // Segue la versione della suite: l'app e il gateway si tengono per mano,
        // e sapere che numero ha in mano il telefono serve quando qualcosa non torna.
        versionCode = 9
        versionName = "0.7.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // La chiave stabile qui sopra, non quella di debug: è ciò che
            // permette all'app di aggiornarsi da sola invece di chiedere ogni
            // volta di disinstallare.
            signingConfig = signingConfigs.getByName("sideload")
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