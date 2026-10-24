plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
val projectVersion = Regex("\\\"version\\\"\\s*:\\s*\\\"([^\\\"]+)\\\"").find(rootProject.file("../../package.json").readText())!!.groupValues[1]
val parts = projectVersion.split('.').map { it.toInt() }
require(parts.size == 3 && parts[1] < 100 && parts[2] < 100)
android {
    namespace = "it.daprod.suite"
    compileSdk = 35
    defaultConfig {
        applicationId = "it.daprod.suite" // Conserva i dati dell'app precedente.
        minSdk = 26
        targetSdk = 35
        versionCode = parts[0]*10000 + parts[1]*100 + parts[2]
        versionName = projectVersion
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    signingConfigs {
        create("continuita") {
            // La firma già usata nella 1.7.10. Non cambiarla senza rotazione.
            storeFile = file(System.getenv("DAPROD_KEYSTORE") ?: "../firma-sideload.jks")
            storePassword = System.getenv("DAPROD_STORE_PASSWORD") ?: "daprod-sideload"
            keyAlias = System.getenv("DAPROD_KEY_ALIAS") ?: "daprod"
            keyPassword = System.getenv("DAPROD_KEY_PASSWORD") ?: "daprod-sideload"
        }
    }
    buildTypes { release { isMinifyEnabled = false; signingConfig = signingConfigs.getByName("continuita") } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
}
dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
