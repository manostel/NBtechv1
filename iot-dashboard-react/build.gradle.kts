plugins {
    kotlin("js") version "1.8.20" apply false
    kotlin("multiplatform") version "1.8.20" apply false
}

allprojects {
    repositories {
        mavenCentral()
        google()
        maven("https://maven.pkg.jetbrains.space/public/p/kotlinx-html/maven")
    }
}

subprojects {
    group = "com.nbtech.iotdashboard"
    version = "1.0.0"
} 