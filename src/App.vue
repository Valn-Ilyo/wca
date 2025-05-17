<template>
    <v-app>
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>

<style>
@font-face {
    font-family: "Futura";
    src: url("/FuturaPTBold.otf") format("opentype");
    font-weight: 700;
    font-style: normal;
}

@font-face {
    font-family: "Futura";
    src: url("/FuturaPTBook.otf") format("opentype");
    font-weight: 400;
    font-style: normal;
}

* {
    font-family: "Futura", sans-serif !important;
}
</style>
