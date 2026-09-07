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
        versionCode = 45
        versionName = "1.1.4"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        /**
         * ⚠ **Solo arm64 sui telefoni.**
         *
         * Il ponte Tailscale porta dentro il runtime di Go: 14 MB per ogni
         * processore che si tiene. Qualunque telefono Android dal 2016 in poi
         * e' arm64, quindi gli altri costerebbero megabyte a tutti per non
         * servire a nessuno.
         *
         * `x86_64` c'e' **solo nella build di debug**, e solo perche'
         * l'emulatore e' un PC: e' l'unico modo di provare questa roba senza
         * un telefono in mano. Vedi `--con-emulatore` in
         */
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
    /**
     * ⚠ **La libreria del ponte si comprime dentro l'APK.**
     *
     * Da AGP 4.2 le librerie native si mettono **non compresse**: si caricano
     * piu' in fretta e non occupano il doppio sul telefono. Con una libreria
     * da 21 MB quella scelta costa pero' 13 MB in piu' **da scaricare**, e
     * questa app si scarica inquadrando un QR — spesso con i dati del
     * telefono, spesso da qualcuno che sta installando una cosa che non
     * conosce ancora.
     *
     * Fra «parte 40 millisecondi prima» e «pesa la meta' da scaricare», per
     * un'app che si distribuisce cosi' vince la seconda.
     */

    buildFeatures {
        viewBinding = true
        // Serve a `BuildConfig.DEBUG`, che decide se la pagina dentro la
        // WebView si puo' ispezionare da un computer. Vedi `preparaWeb`.
        buildConfig = true
    }
}

/**
 * ⚠ **Il primo banco di prova di questo modulo.** Nuovo nella 0.9.5.
 *
 * Fino a ieri qui non si provava niente, e si vedeva: «ad ogni aggiornamento
 * devo eliminare e rifare l'account» e' stato detto **tre volte**, e le prime
 * due l'ho curato dalla parte sbagliata. La regola che mancava — fra due
 * indirizzi che rispondono vince quello vicino, perche' l'altro scade — e'
 * esattamente il genere di cosa che si disfa senza accorgersene.
 *
 * Sono prove **senza Android**: girano sulla JVM in mezzo secondo con
 * `gradlew test`, e provano la parte che decide, non quella che parla in rete.
 */
dependencies {
    testImplementation("junit:junit:4.13.2")

    /**
     * ⚠ **Le prove che devono girare su Android vero.**
     *
     * Ce n'e' una sola famiglia, ed e' quella del ponte Tailscale: e' un pezzo
     * in Go dentro una libreria nativa, e se non si carica non lo dice nessun
     */
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
    // ActivityScenario: serve ad accendere davvero MainActivity dentro la
    // prova, che e' l'unico modo di vedere cosa finisce sullo schermo.
    androidTestImplementation("androidx.test:core-ktx:1.6.1")
    /**
     * ⚠ **org.json vero, sul banco delle prove.**
     *
     * Dentro Android `org.json` c'e' ed e' vero; nelle prove sulla JVM Android
     * mette al suo posto un **guscio vuoto**, e ogni metodo solleva «not
     * mocked». Senza questa riga le prove che leggono un profilo passerebbero
     * per il motivo sbagliato: il parser solleva, il codice cattura, e la lista
     * vuota che ne esce sembra la risposta giusta.
     *
     * Questa dipendenza sta **solo** nelle prove: nell'app continua a valere
     * quello di Android.
     */
    testImplementation("org.json:json:20240303")
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

    /*
     * La sessione e la notifica della musica.
     *
     * **Non è un lettore.** Il suono lo fa la pagina dentro la WebView, che è
     * l'unico posto da cui il visualizer può sentirlo; questa libreria serve a
     * due cose sole: la MediaSession (i tasti sulle cuffie e sulla schermata di
     * blocco) e lo stile della notifica. Media3/ExoPlayer farebbe il resto, ma
     * il resto qui non serve: sarebbero tre megabyte per non usarne il lettore.
     */
    implementation("androidx.media:media:1.7.0")

    /**
     *
     * git — 14 MB di roba compilata — quindi **se questa riga non trova
     * niente, il file va rifatto**, e la compilazione lo dice.
     *
     * Perche' un pezzo in Go dentro un'app Kotlin: perche' `tsnet` esiste solo
     * in Go, e riscrivere WireGuard piu' il piano di controllo di Tailscale in
     * Kotlin non e' una cosa che si fa. Vedi il commento in cima a `ponte.go`.
     */

    /**
     * Serve a far passare **anche la WebView** dal ponte.
     *
     * `ProxyController` e' l'unico modo di dire a Chromium «per questa app,
     * passa di qui». Senza, le chiamate di OkHttp passerebbero dal tailnet e la
     * pagina dentro la WebView no: meta' dell'app funzionerebbe da fuori casa e
     * meta' no, che e' peggio di non funzionare — perche' non si capisce.
     */
}