import React, { useState } from 'react';
import {
  Smartphone, Apple, PlayCircle, CheckCircle2, ChevronRight, ChevronDown,
  Copy, ExternalLink, AlertTriangle, Info, Shield, Image, FileText,
  Key, Bell, MapPin, Fingerprint, RefreshCw, Rocket, Terminal, Download,
  Globe, Upload, Star, Clock, DollarSign, Settings, Zap, Package
} from 'lucide-react';
import clsx from 'clsx';

interface StepProps {
  number: number;
  title: string;
  time?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Step: React.FC<StepProps> = ({ number, title, time, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shrink-0">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          {time && <p className="text-xs text-slate-400 mt-0.5">{time}</p>}
        </div>
        {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {code}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copiar"
      >
        {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
    </div>
  );
};

const Tip: React.FC<{ children: React.ReactNode; type?: 'info' | 'warning' | 'success' }> = ({ children, type = 'info' }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };
  const icons = {
    info: <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />,
    success: <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />,
  };
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs leading-relaxed ${styles[type]}`}>
      {icons[type]}
      <div>{children}</div>
    </div>
  );
};

const Checklist: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="space-y-2">
    {items.map((item, i) => (
      <label key={i} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer group">
        <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
        <span className="group-hover:text-slate-900">{item}</span>
      </label>
    ))}
  </div>
);

export const AppManual: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'android' | 'ios' | 'updates' | 'checklist'>('android');

  const sections = [
    { id: 'android' as const, label: 'Android', icon: <PlayCircle size={16} />, color: 'text-green-600 bg-green-50' },
    { id: 'ios' as const, label: 'iOS', icon: <Apple size={16} />, color: 'text-slate-700 bg-slate-100' },
    { id: 'updates' as const, label: 'Atualizações', icon: <RefreshCw size={16} />, color: 'text-purple-600 bg-purple-50' },
    { id: 'checklist' as const, label: 'Checklist', icon: <CheckCircle2 size={16} />, color: 'text-teal-600 bg-teal-50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Smartphone size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800">Manual do App Mobile</h1>
          <p className="text-sm text-slate-500">Guia completo para publicar na Play Store e App Store</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all',
              activeSection === s.id
                ? `${s.color} shadow-sm border border-current/10`
                : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-50'
            )}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ANDROID */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'android' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <PlayCircle size={24} className="text-green-600" />
              <h2 className="text-lg font-black text-green-800">Publicar na Google Play Store</h2>
            </div>
            <p className="text-sm text-green-700">Custo: <strong>$25 (taxa única)</strong> | Tempo de revisão: <strong>1-7 dias</strong></p>
          </div>

          <Step number={1} title="Pré-requisitos" time="15 minutos" defaultOpen={true}>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Instale as ferramentas necessárias:</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Download size={18} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Android Studio</p>
                    <a href="https://developer.android.com/studio" target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 flex items-center gap-1 hover:underline">
                      developer.android.com/studio <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Globe size={18} className="text-slate-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Google Play Console</p>
                    <a href="https://play.google.com/console" target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 flex items-center gap-1 hover:underline">
                      play.google.com/console <ExternalLink size={10} />
                    </a>
                    <p className="text-xs text-slate-500 mt-1">Crie uma conta de desenvolvedor ($25 taxa única)</p>
                  </div>
                </div>
              </div>
            </div>
          </Step>

          <Step number={2} title="Configurar Firebase (Push Notifications)" time="15 minutos">
            <div className="space-y-4">
              <Checklist items={[
                'Acesse console.firebase.google.com e crie um novo projeto "VOLL Pilates"',
                'Clique em "Adicionar app" > ícone Android',
                'Package name: com.vollpilates.app',
                'Baixe o arquivo google-services.json',
                'Copie o arquivo para a pasta android/app/ do projeto',
                'No Firebase, vá em Configurações > Cloud Messaging',
                'Copie a "Server Key" (você vai usar no Supabase)',
              ]} />
              <Tip type="warning">
                <strong>Importante:</strong> Guarde a Server Key em local seguro. Ela será usada na Edge Function de push notifications.
              </Tip>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-3">Adicionar a chave no Supabase:</p>
              <Checklist items={[
                'Abra o Supabase Dashboard > Edge Functions > Secrets',
                'Adicione: FCM_SERVER_KEY = (cole a Server Key do Firebase)',
              ]} />
            </div>
          </Step>

          <Step number={3} title="Gerar o Projeto Android" time="5 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Rode estes comandos no terminal, na pasta do projeto:</p>
              <CodeBlock code={`npm run build\nnpx cap add android\nnpx cap sync`} />
              <Tip type="info">
                O comando <code className="bg-slate-200 px-1 rounded text-xs">npx cap add android</code> cria a pasta <code className="bg-slate-200 px-1 rounded text-xs">android/</code> com o projeto nativo. Só precisa rodar uma vez.
              </Tip>
            </div>
          </Step>

          <Step number={4} title="Testar no Dispositivo / Emulador" time="10 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Para abrir no Android Studio:</p>
              <CodeBlock code="npm run cap:open:android" />
              <p className="text-sm text-slate-600 mt-3">Ou rodar direto no celular conectado via USB:</p>
              <CodeBlock code="npm run cap:run:android" />
              <Tip type="info">
                Para testar no celular físico, ative <strong>"Depuração USB"</strong> nas configurações do desenvolvedor do Android.
              </Tip>
            </div>
          </Step>

          <Step number={5} title="Gerar a Keystore de Assinatura" time="5 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">A keystore é o "certificado" que identifica você como dono do app. Rode no terminal:</p>
              <CodeBlock code={`keytool -genkey -v -keystore voll-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias voll`} />
              <Tip type="warning">
                <strong>NUNCA PERCA a keystore e a senha!</strong> Se perder, não conseguirá mais atualizar o app na Play Store. Faça backup em local seguro (drive, cofre digital).
              </Tip>
              <p className="text-xs text-slate-500 mt-2">O terminal vai pedir:</p>
              <Checklist items={[
                'Senha da keystore (crie uma forte e anote)',
                'Seu nome completo',
                'Nome da empresa: VOLL Pilates Group',
                'Cidade, Estado, País (BR)',
              ]} />
            </div>
          </Step>

          <Step number={6} title="Gerar o AAB (Android App Bundle)" time="10 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">No Android Studio:</p>
              <Checklist items={[
                'Menu Build > Generate Signed Bundle / APK',
                'Selecione "Android App Bundle"',
                'Selecione a keystore que criou no passo anterior',
                'Preencha a senha e alias (voll)',
                'Selecione "release" como build variant',
                'Clique em "Create"',
              ]} />
              <p className="text-xs text-slate-500 mt-2">O arquivo .aab será gerado em <code className="bg-slate-200 px-1 rounded">android/app/release/app-release.aab</code></p>
            </div>
          </Step>

          <Step number={7} title="Preparar Assets para a Loja" time="30 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 font-bold">Você vai precisar de:</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Image size={16} className="text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Ícone do App</p>
                    <p className="text-xs text-slate-500">512 x 512 px, PNG, sem transparência, cantos arredondados automáticos</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Image size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Feature Graphic</p>
                    <p className="text-xs text-slate-500">1024 x 500 px, PNG ou JPG (banner da loja)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Smartphone size={16} className="text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Screenshots (mínimo 4)</p>
                    <p className="text-xs text-slate-500">Resolução de celular (ex: 1080 x 1920). Tire prints do app rodando no emulador.</p>
                  </div>
                </div>
              </div>
              <Tip type="info">
                <strong>Dica rápida:</strong> Use o Canva (canva.com) para criar o ícone, feature graphic e montar os screenshots com moldura de celular. É gratuito e rápido.
              </Tip>

              <p className="text-sm text-slate-600 font-bold mt-4">Textos obrigatórios:</p>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Nome do App</p>
                  <p className="text-sm text-slate-800">VOLL Pilates</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Descrição Curta (80 caracteres)</p>
                  <p className="text-sm text-slate-800">Acesse turmas, cursos e certificados do VOLL Pilates Group direto no celular.</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Descrição Longa (sugestão)</p>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    O app oficial do VOLL Pilates Group para alunos e instrutores.{'\n\n'}
                    Para Alunos:{'\n'}
                    - Consulte suas turmas e horários{'\n'}
                    - Acesse cursos online com vídeos{'\n'}
                    - Visualize e compartilhe seus certificados{'\n'}
                    - Inscreva-se em eventos e workshops{'\n'}
                    - Assine contratos digitalmente{'\n'}
                    - Encontre studios parceiros próximos{'\n\n'}
                    Para Instrutores:{'\n'}
                    - Veja suas turmas e lista de alunos{'\n'}
                    - Acesse treinamentos e cursos{'\n'}
                    - Gerencie contratos pendentes{'\n'}
                    - Receba novidades e comunicados{'\n'}
                    - Abra chamados de suporte{'\n\n'}
                    Login seguro com biometria (Face ID / impressão digital).{'\n'}
                    Notificações push para avisos importantes.{'\n'}
                    Funciona offline com dados essenciais em cache.
                  </p>
                </div>
              </div>
            </div>
          </Step>

          <Step number={8} title="Publicar na Google Play Console" time="30 minutos">
            <div className="space-y-4">
              <Checklist items={[
                'Acesse play.google.com/console',
                'Clique em "Criar app"',
                'Nome: VOLL Pilates | Idioma: Português (Brasil)',
                'Tipo: App | Gratuito ou Pago: Gratuito',
                'Aceite os termos e crie',
              ]} />
              <p className="text-sm font-bold text-slate-600 mt-4">Preencher a Ficha da Loja:</p>
              <Checklist items={[
                'Painel > Ficha da Loja > Descrição curta e completa (use os textos acima)',
                'Faça upload do ícone, feature graphic e screenshots',
                'Categoria: Saúde e Fitness',
                'Email de contato (obrigatório)',
              ]} />
              <p className="text-sm font-bold text-slate-600 mt-4">Classificação de Conteúdo:</p>
              <Checklist items={[
                'Painel > Política > Classificação de conteúdo',
                'Preencha o questionário (o app não tem violência/conteúdo adulto, marque tudo como "Não")',
                'Resultado esperado: Livre para todos',
              ]} />
              <p className="text-sm font-bold text-slate-600 mt-4">Enviar o App:</p>
              <Checklist items={[
                'Painel > Produção > Criar nova versão',
                'Faça upload do arquivo .aab',
                'Preencha as notas da versão (ex: "Versão inicial do app VOLL Pilates")',
                'Revise e clique em "Iniciar lançamento para Produção"',
                'Enviar para revisão do Google',
              ]} />
              <Tip type="success">
                A revisão do Google leva de <strong>1 a 7 dias</strong>. Para a primeira vez pode demorar mais. Você receberá um email quando aprovado.
              </Tip>
            </div>
          </Step>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* iOS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'ios' && (
        <div className="space-y-4">
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Apple size={24} className="text-slate-800" />
              <h2 className="text-lg font-black text-slate-800">Publicar na Apple App Store</h2>
            </div>
            <p className="text-sm text-slate-600">Custo: <strong>$99/ano</strong> | Tempo de revisão: <strong>1-3 dias</strong></p>
          </div>

          <Tip type="warning">
            <strong>Requisito obrigatório:</strong> Você precisa de um <strong>Mac com macOS</strong> e <strong>Xcode 15+</strong> instalado. Não é possível compilar apps iOS no Windows/Linux.
            Se não tem um Mac, considere alugar um Mac na nuvem (ex: <a href="https://www.macincloud.com" target="_blank" rel="noopener noreferrer" className="underline">MacInCloud</a> ou <a href="https://aws.amazon.com/ec2/instance-types/mac/" target="_blank" rel="noopener noreferrer" className="underline">AWS Mac</a>).
          </Tip>

          <Step number={1} title="Criar Apple Developer Account" time="10 minutos (aprovação pode levar 24-48h)">
            <div className="space-y-4">
              <Checklist items={[
                'Acesse developer.apple.com/account',
                'Faça login com seu Apple ID (ou crie um)',
                'Clique em "Enroll" no Apple Developer Program',
                'Pague a taxa anual de $99',
                'Aguarde aprovação (geralmente 24-48h para contas pessoais)',
              ]} />
              <Tip type="info">
                Se for publicar como empresa (VOLL Pilates Group), você precisará de um <strong>D-U-N-S Number</strong>. Solicite gratuitamente em dnb.com. Leva ~5 dias úteis.
              </Tip>
            </div>
          </Step>

          <Step number={2} title="Gerar o Projeto iOS" time="5 minutos">
            <div className="space-y-4">
              <CodeBlock code={`npm run build\nnpx cap add ios\nnpx cap sync`} />
              <p className="text-sm text-slate-600">Para abrir no Xcode:</p>
              <CodeBlock code="npm run cap:open:ios" />
            </div>
          </Step>

          <Step number={3} title="Configurar Signing no Xcode" time="10 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">No Xcode, com o projeto aberto:</p>
              <Checklist items={[
                'Clique no projeto "App" na barra lateral esquerda',
                'Na aba "Signing & Capabilities"',
                'Marque "Automatically manage signing"',
                'Selecione seu Team (a conta Developer que criou)',
                'O Bundle Identifier já deve ser: com.vollpilates.app',
              ]} />
              <p className="text-sm font-bold text-slate-600 mt-4">Adicionar Capabilities:</p>
              <Checklist items={[
                'Clique em "+ Capability"',
                'Adicione "Push Notifications"',
                'Adicione "Background Modes" > marque "Remote notifications"',
              ]} />
            </div>
          </Step>

          <Step number={4} title="Configurar Permissões (Info.plist)" time="5 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">No Xcode, abra o arquivo <code className="bg-slate-200 px-1 rounded text-xs">Info.plist</code> e adicione estas chaves:</p>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-mono text-slate-600">NSCameraUsageDescription</span>
                  <span className="text-slate-500">Precisamos da câmera para sua foto de perfil</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-slate-600">NSLocationWhenInUseUsageDescription</span>
                  <span className="text-slate-500">Para encontrar studios próximos a você</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-slate-600">NSFaceIDUsageDescription</span>
                  <span className="text-slate-500">Para login rápido com Face ID</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-slate-600">NSPhotoLibraryUsageDescription</span>
                  <span className="text-slate-500">Para selecionar fotos da galeria</span>
                </div>
              </div>
              <Tip type="info">
                Os plugins do Capacitor já adicionam a maioria dessas chaves automaticamente. Verifique no Info.plist e adicione apenas as que faltarem.
              </Tip>
            </div>
          </Step>

          <Step number={5} title="Configurar Push no iOS (APNs)" time="15 minutos">
            <div className="space-y-4">
              <Checklist items={[
                'Acesse developer.apple.com > Certificates, IDs & Profiles',
                'Vá em Keys > clique no "+"',
                'Nome: "VOLL Push Key"',
                'Marque "Apple Push Notifications service (APNs)"',
                'Clique em "Continue" > "Register"',
                'Baixe o arquivo .p8 (GUARDE EM LOCAL SEGURO, só pode baixar uma vez!)',
                'Anote o Key ID que aparece na tela',
                'No Firebase Console > Configurações > Cloud Messaging > iOS',
                'Faça upload do arquivo .p8, informe o Key ID e o Team ID',
              ]} />
            </div>
          </Step>

          <Step number={6} title="Testar no Simulador / Dispositivo" time="10 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">No Xcode, selecione um simulador (ex: iPhone 15 Pro) e clique em <strong>Run</strong> (ícone de play).</p>
              <Tip type="warning">
                Push notifications <strong>não funcionam no simulador</strong>. Para testar push, use um iPhone físico conectado ao Mac.
              </Tip>
            </div>
          </Step>

          <Step number={7} title="Preparar Assets para a App Store" time="30 minutos">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Image size={16} className="text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Ícone do App</p>
                    <p className="text-xs text-slate-500">1024 x 1024 px, PNG, <strong>sem transparência</strong>, sem cantos arredondados (o iOS arredonda sozinho)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <Smartphone size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">Screenshots Obrigatórios</p>
                    <p className="text-xs text-slate-500">
                      iPhone 6.7" (1290 x 2796) - obrigatório{'\n'}
                      iPhone 6.5" (1284 x 2778) - obrigatório{'\n'}
                      iPhone 5.5" (1242 x 2208) - opcional{'\n'}
                      Mínimo 3 screenshots por tamanho
                    </p>
                  </div>
                </div>
              </div>
              <Tip type="info">
                <strong>Atalho:</strong> Tire screenshots no simulador do Xcode (Cmd + S). Use o simulador do iPhone 15 Pro Max para 6.7" e iPhone 14 Plus para 6.5".
              </Tip>
            </div>
          </Step>

          <Step number={8} title="Gerar Archive e Fazer Upload" time="15 minutos">
            <div className="space-y-4">
              <Checklist items={[
                'No Xcode, selecione "Any iOS Device" como destino (não um simulador)',
                'Menu Product > Archive',
                'Aguarde o build completar',
                'O Organizer vai abrir automaticamente',
                'Clique em "Distribute App"',
                'Selecione "App Store Connect"',
                'Clique em "Upload"',
                'Aguarde o upload completar',
              ]} />
            </div>
          </Step>

          <Step number={9} title="Publicar no App Store Connect" time="30 minutos">
            <div className="space-y-4">
              <Checklist items={[
                'Acesse appstoreconnect.apple.com',
                'Clique em "Meus Apps" > "+" > "Novo App"',
                'Nome: VOLL Pilates',
                'Idioma principal: Português (Brasil)',
                'Bundle ID: com.vollpilates.app',
                'SKU: vollpilates',
              ]} />
              <p className="text-sm font-bold text-slate-600 mt-4">Preencher Metadata:</p>
              <Checklist items={[
                'Descrição (use o mesmo texto do Android)',
                'Palavras-chave: pilates, fitness, turmas, certificados, cursos',
                'URL de suporte (site da VOLL ou email)',
                'URL de política de privacidade (OBRIGATÓRIO)',
                'Categoria: Saúde e Fitness',
                'Classificação etária (preencha o questionário)',
                'Faça upload dos screenshots',
                'Selecione o build que enviou do Xcode',
                'Clique em "Enviar para Revisão"',
              ]} />
              <Tip type="warning">
                <strong>URL de Política de Privacidade é obrigatória!</strong> Se não tiver uma, crie uma página simples no site da VOLL explicando quais dados o app coleta (email, localização, etc).
              </Tip>
              <Tip type="success">
                A revisão da Apple leva de <strong>1 a 3 dias</strong>. Se rejeitar, leia o motivo, corrija e reenvie. Motivos comuns: falta de política de privacidade, screenshots ruins, ou crash no app.
              </Tip>
            </div>
          </Step>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ATUALIZAÇÕES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'updates' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Zap size={24} className="text-purple-600" />
              <h2 className="text-lg font-black text-purple-800">Atualizações Instantâneas (Live Update)</h2>
            </div>
            <p className="text-sm text-purple-700">Atualize o app <strong>sem passar pela loja</strong> usando o Capgo</p>
          </div>

          <Step number={1} title="O que é Live Update?" defaultOpen={true}>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Normalmente, para atualizar um app você precisa gerar novo build, enviar para a loja e esperar 1-7 dias de revisão.
                Com o <strong>Capgo Live Update</strong>, as mudanças no código web (React/TypeScript/CSS) são enviadas diretamente para os dispositivos dos usuários, <strong>em minutos</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-red-600 uppercase mb-2">Sem Live Update</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Alterar código → Build → cap sync → Build nativo → Upload na loja → 1-7 dias revisão → Usuário atualiza manualmente
                  </p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-green-600 uppercase mb-2">Com Live Update</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    Alterar código → Build → Upload Capgo → App detecta e atualiza sozinho → <strong>Minutos!</strong>
                  </p>
                </div>
              </div>
            </div>
          </Step>

          <Step number={2} title="Configurar Capgo" time="10 minutos">
            <div className="space-y-4">
              <Checklist items={[
                'Crie conta em capgo.app (plano gratuito: 1000 dispositivos)',
                'Copie sua API Key do dashboard',
              ]} />
              <p className="text-sm text-slate-600 mt-2">No terminal:</p>
              <CodeBlock code={`npx @capgo/cli init`} />
              <p className="text-xs text-slate-500">Siga as instruções e cole a API Key quando pedida.</p>
            </div>
          </Step>

          <Step number={3} title="Enviar Atualização" time="2 minutos">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Toda vez que alterar algo nas áreas de Aluno ou Instrutor, rode:</p>
              <CodeBlock code={`npm run build\nnpx @capgo/cli bundle upload --channel production`} />
              <Tip type="success">
                Pronto! Os usuários receberão a atualização automaticamente na próxima vez que abrirem o app.
              </Tip>
            </div>
          </Step>

          <Step number={4} title="Quando PRECISA da loja?" time="">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">O Live Update cobre 95% das atualizações. Você SÓ precisa enviar nova versão para a loja quando:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">Adicionar um novo plugin nativo (ex: Bluetooth, NFC)</p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">Atualizar a versão do Capacitor</p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">Mudar permissões nativas (nova permissão de sensor, etc)</p>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl">
                  <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">Alterar o capacitor.config.ts</p>
                </div>
              </div>
            </div>
          </Step>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CHECKLIST */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'checklist' && (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 size={24} className="text-teal-600" />
              <h2 className="text-lg font-black text-teal-800">Checklist Completo de Publicação</h2>
            </div>
            <p className="text-sm text-teal-700">Marque cada item conforme for completando</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Package size={16} className="text-slate-500" /> Preparação Inicial
            </h3>
            <Checklist items={[
              'SQL migration 005 executada no Supabase ✓',
              'npm install rodado com sucesso',
              'npm run build funciona sem erros',
              'npx cap add android executado',
              'npx cap add ios executado (se tiver Mac)',
              'npx cap sync executado',
            ]} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Bell size={16} className="text-orange-500" /> Push Notifications
            </h3>
            <Checklist items={[
              'Projeto criado no Firebase Console',
              'App Android adicionado com package com.vollpilates.app',
              'google-services.json copiado para android/app/',
              'FCM_SERVER_KEY adicionada nos Secrets do Supabase',
              'Edge Function push-notify deployada no Supabase',
              'Chave APNs (.p8) criada no Apple Developer (se iOS)',
              'Chave APNs configurada no Firebase (se iOS)',
            ]} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <PlayCircle size={16} className="text-green-500" /> Google Play Store
            </h3>
            <Checklist items={[
              'Conta de desenvolvedor Google criada ($25)',
              'Keystore de assinatura gerada e guardada em segurança',
              'AAB gerado via Android Studio',
              'Ícone do app (512x512 PNG)',
              'Feature Graphic (1024x500)',
              'Pelo menos 4 screenshots do app',
              'Descrição curta e longa preenchidas',
              'Categoria selecionada (Saúde e Fitness)',
              'Classificação de conteúdo preenchida',
              'Política de privacidade publicada',
              'AAB uploaded na Play Console',
              'Enviado para revisão',
            ]} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Apple size={16} className="text-slate-700" /> Apple App Store
            </h3>
            <Checklist items={[
              'Apple Developer Account ativa ($99/ano)',
              'Signing configurado no Xcode',
              'Push Notifications capability adicionada',
              'Info.plist com todas as descrições de permissão',
              'Archive gerado e upload feito para App Store Connect',
              'Ícone do app (1024x1024 PNG sem transparência)',
              'Screenshots iPhone 6.7" (pelo menos 3)',
              'Screenshots iPhone 6.5" (pelo menos 3)',
              'Descrição e palavras-chave preenchidas',
              'URL de política de privacidade adicionada',
              'Classificação etária preenchida',
              'Build selecionado no App Store Connect',
              'Enviado para revisão',
            ]} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Zap size={16} className="text-purple-500" /> Live Update (Capgo)
            </h3>
            <Checklist items={[
              'Conta criada no capgo.app',
              'npx @capgo/cli init executado',
              'Primeiro bundle uploaded com sucesso',
              'Testado: alterar código → upload → app atualiza',
            ]} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Shield size={16} className="text-red-500" /> Segurança (NUNCA PERDER)
            </h3>
            <div className="space-y-2">
              {[
                'Keystore Android (.jks) + senha → guardados em local seguro',
                'Chave APNs iOS (.p8) → guardada em local seguro',
                'FCM Server Key → anotada / em gerenciador de senhas',
                'Conta Google Play → email e senha seguros',
                'Conta Apple Developer → Apple ID e senha seguros',
                'Conta Capgo → API Key guardada',
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-2 text-xs text-red-700 cursor-pointer group">
                  <input type="checkbox" className="mt-0.5 rounded border-red-300 text-red-600 focus:ring-red-500" />
                  <span className="group-hover:text-red-900">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
