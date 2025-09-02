/// <reference types="@types/node" />

import * as path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    root: path.resolve(__dirname),
    base: "./",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, "index.html")
            }
        },
        minify: true,
        sourcemap: false
    },
    plugins: [
        vue()
    ],
    server: {
        fs: {
            allow: ["../.."]
        }
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src")
        }
    }
});