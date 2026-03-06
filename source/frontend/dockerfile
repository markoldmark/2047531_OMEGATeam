# --- STAGE 1: Build dell'applicazione ---
# Usa l'immagine ufficiale di Node (versione Alpine per essere più leggera)
FROM node:20-alpine as builder

# Imposta la directory di lavoro dentro il container
WORKDIR /app

# Copia prima solo i file delle dipendenze per sfruttare la cache di Docker
COPY package.json package-lock.json ./

# Installa le dipendenze
RUN npm ci

# Copia tutto il resto del codice sorgente
COPY . .

# Lancia la build di Vite (creerà la cartella /app/dist)
RUN npm run build


# --- STAGE 2: Serve dei file statici ---
# Usa Nginx per servire l'app buildata
FROM nginx:alpine

# Copia i file statici generati dallo Stage 1 nella directory di default di Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Esponi la porta 80 per il traffico web
EXPOSE 80

# Avvia Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]