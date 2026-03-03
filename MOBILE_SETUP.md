# VOLL Pilates - Guia de Configuracao do App Mobile

## Pre-requisitos

- Node.js 18+
- Para iOS: macOS com Xcode 15+ e Apple Developer Account ($99/ano)
- Para Android: Android Studio e Google Play Console ($25 unica vez)

## 1. Gerar Projetos Nativos

```bash
# Fazer build web primeiro
npm run build

# Adicionar plataformas
npx cap add ios
npx cap add android

# Sincronizar
npx cap sync
```

## 2. Configurar Android

### 2.1 Firebase (Push Notifications)
1. Criar projeto no Firebase Console (https://console.firebase.google.com)
2. Adicionar app Android com package name: `com.vollpilates.app`
3. Baixar `google-services.json` e colocar em `android/app/`
4. A chave do servidor FCM deve ser adicionada como env var `FCM_SERVER_KEY` no Supabase

### 2.2 Permissoes (AndroidManifest.xml)
As permissoes de camera, localizacao e internet ja sao adicionadas automaticamente pelos plugins do Capacitor.

### 2.3 Keystore de Assinatura
```bash
keytool -genkey -v -keystore voll-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias voll
```
GUARDAR a keystore e senha em local seguro!

### 2.4 Abrir no Android Studio
```bash
npm run cap:open:android
```

## 3. Configurar iOS

### 3.1 Apple Developer
1. Criar App ID no Apple Developer Portal
2. Bundle ID: `com.vollpilates.app`
3. Ativar capabilities: Push Notifications, Associated Domains

### 3.2 Push Notifications (APNs)
1. Criar chave APNs no Apple Developer Portal
2. Fazer upload da chave no Firebase (Cloud Messaging > iOS)

### 3.3 Abrir no Xcode
```bash
npm run cap:open:ios
```
No Xcode:
- Selecionar Team de desenvolvimento
- Configurar Signing & Capabilities
- Adicionar Push Notifications capability
- Adicionar Camera Usage Description no Info.plist
- Adicionar Location Usage Description no Info.plist
- Adicionar Face ID Usage Description no Info.plist

## 4. Variaveis de Ambiente (Supabase)

Adicionar no Supabase Dashboard > Edge Functions > Secrets:
- `FCM_SERVER_KEY` - Chave do servidor FCM do Firebase

## 5. Executar Migration do Banco

No Supabase SQL Editor, executar o arquivo:
`supabase/migrations/005_mobile_app_tables.sql`

## 6. Build e Teste

```bash
# Build web + sync com projetos nativos
npm run build:mobile

# Rodar no emulador Android
npm run cap:run:android

# Rodar no simulador iOS (apenas macOS)
npm run cap:run:ios
```

## 7. Live Update (Capgo)

### 7.1 Setup inicial
```bash
npx @capgo/cli init
```

### 7.2 Deploy de atualizacao
```bash
npm run build
npx @capgo/cli bundle upload --channel production
```

### 7.3 Canais
- `production` - Usuarios finais
- `beta` - Teste interno

## 8. Publicar nas Lojas

### Google Play Store
1. Gerar AAB: Android Studio > Build > Generate Signed Bundle
2. Criar app no Google Play Console
3. Preencher ficha da loja (titulo, descricao, screenshots)
4. Classificacao de conteudo
5. Upload do AAB
6. Enviar para revisao

### Apple App Store
1. Gerar Archive: Xcode > Product > Archive
2. Upload via Xcode Organizer
3. Preencher metadata no App Store Connect
4. Screenshots obrigatorios: 6.7", 6.5", 5.5"
5. Enviar para revisao

## Estrutura de Arquivos Mobile

```
services/
  platformService.ts    - Deteccao de plataforma (iOS/Android/Web)
  pushService.ts        - Push notifications (registro, listeners)
  biometricService.ts   - Login biometrico (Face ID, impressao digital)
  cameraService.ts      - Camera e galeria de fotos
  geolocationService.ts - Geolocalizacao e studios proximos
  offlineService.ts     - Cache offline e fila de operacoes
  liveUpdateService.ts  - Atualizacoes OTA via Capgo

components/mobile/
  MobileApp.tsx         - Shell principal do app mobile
  MobileLogin.tsx       - Tela de login mobile com biometria
  MobileHeader.tsx      - Cabecalho mobile
  MobileBottomNav.tsx   - Navegacao inferior
  NearbyStudios.tsx     - Tela de studios proximos

supabase/
  migrations/005_mobile_app_tables.sql  - Tabelas mobile
  functions/push-notify/index.ts        - Edge Function de push

capacitor.config.ts     - Configuracao do Capacitor
```
