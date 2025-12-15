import express from 'express';
import cors from 'cors';
import natural from 'natural';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

// SECRET PARA JWT
const JWT_SECRET = 'mi-secreto-super-seguro-2024';

// CONEXIÓN A POSTGRESQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'asistmedic',
  password: '12345678',
  port: 5432,
});

pool.connect()
  .then(() => console.log('✅ Conectado a PostgreSQL'))
  .catch(err => console.error('❌ Error conectando a PostgreSQL:', err));

// DATASET COMPLETO (140 enfermedades)
const diagnosticos = [
  { enfermedad: "Migraña", sintomas: "dolor cabeza intenso pulsante náuseas vómitos sensibilidad luz sonido fotofobia aura visual mareo" },
  { enfermedad: "Sinusitis aguda", sintomas: "dolor cabeza frontal presión facial congestión nasal secreción amarilla verdosa moco espeso dolor mejillas frente fiebre" },
  { enfermedad: "Gripe", sintomas: "fiebre alta escalofríos dolor cuerpo muscular fatiga cansancio extremo tos seca dolor garganta congestión nasal" },
  { enfermedad: "Faringitis", sintomas: "dolor garganta ardor tragar dificultad deglución amígdalas inflamadas rojas fiebre ganglios cuello" },
  { enfermedad: "Gastroenteritis", sintomas: "diarrea líquida dolor abdominal cólicos náuseas vómitos deshidratación fiebre malestar estómago" },
  { enfermedad: "Resfriado común", sintomas: "congestión nasal moqueo estornudos frecuentes tos leve dolor garganta irritación nariz tapada" },
  { enfermedad: "Bronquitis", sintomas: "tos persistente flema expectoración mucosidad dificultad respirar silbido pecho dolor torácico" },
  { enfermedad: "Neumonía", sintomas: "fiebre muy alta tos productiva flema amarilla verdosa dolor pecho respirar dificultad respiratoria escalofríos" },
  { enfermedad: "Asma", sintomas: "dificultad respirar silbido tos opresión pecho falta aire respiración sibilante" },
  { enfermedad: "Dermatitis atópica", sintomas: "picazón intensa enrojecimiento piel erupciones sarpullido resequedad" },
  { enfermedad: "Psoriasis", sintomas: "enrojecimiento piel descamación placas blancas escamas gruesas" },
  { enfermedad: "Acné", sintomas: "espinillas puntos negros enrojecimiento facial granos pústulas" },
  { enfermedad: "Alergia estacional", sintomas: "estornudos congestión nasal picazón ocular lagrimeo rinitis" },
  { enfermedad: "Urticaria", sintomas: "ronchas picazón enrojecimiento piel habones alergia" },
  { enfermedad: "Angioedema", sintomas: "hinchazón labios lengua cara dificultad respirar inflamación" },
  { enfermedad: "Diabetes tipo 1", sintomas: "sed excesiva polidipsia micción frecuente poliuria fatiga pérdida peso hambre" },
  { enfermedad: "Diabetes tipo 2", sintomas: "sed excesiva micción frecuente visión borrosa cansancio heridas lentas cicatrizar" },
  { enfermedad: "Hipertensión", sintomas: "dolor cabeza occipital mareos zumbido oídos visión borrosa palpitaciones presión alta" },
  { enfermedad: "Hipotensión", sintomas: "mareos debilidad fatiga desmayo visión borrosa presión baja" },
  { enfermedad: "Arritmia cardíaca", sintomas: "palpitaciones mareos dificultad respirar latidos irregulares taquicardia" },
  { enfermedad: "Infarto miocardio", sintomas: "dolor pecho intenso brazo izquierdo sudoración fría náuseas opresión pecho" },
  { enfermedad: "Angina pecho", sintomas: "dolor pecho presión opresión dificultad respirar dolor irradia brazo" },
  { enfermedad: "Insuficiencia cardíaca", sintomas: "falta aire fatiga hinchazón piernas tobillos pies edema dificultad respirar acostado" },
  { enfermedad: "Accidente cerebrovascular", sintomas: "debilidad repentina cara brazo pierna dificultad hablar mareos confusión pérdida equilibrio" },
  { enfermedad: "Epilepsia", sintomas: "convulsiones pérdida consciencia temblores sacudidas espasmos" },
  { enfermedad: "Parkinson", sintomas: "temblor manos rigidez muscular lentitud movimiento dificultad caminar" },
  { enfermedad: "Alzheimer", sintomas: "pérdida memoria olvidos confusión desorientación dificultad reconocer personas" },
  { enfermedad: "Esquizofrenia", sintomas: "alucinaciones voces delirios pensamientos paranoia desorganización pensamiento" },
  { enfermedad: "Depresión", sintomas: "tristeza profunda persistente falta interés actividades fatiga cansancio insomnio pérdida apetito" },
  { enfermedad: "Ansiedad", sintomas: "nerviosismo preocupación excesiva palpitaciones sudoración manos temblorosas tensión muscular inquietud miedo" },
  { enfermedad: "Trastorno bipolar", sintomas: "cambios humor extremos euforia manía depresión energía fluctuante" },
  { enfermedad: "TOC", sintomas: "pensamientos intrusivos obsesivos comportamientos repetitivos compulsivos ritual lavado manos" },
  { enfermedad: "Fobia social", sintomas: "miedo extremo situaciones sociales ansiedad timidez evitación social" },
  { enfermedad: "Insomnio", sintomas: "dificultad conciliar sueño despertar frecuente noche cansancio diurno fatiga irritabilidad" },
  { enfermedad: "Apnea sueño", sintomas: "ronquidos fuertes pausas respiratorias dormir somnolencia diurna cansancio despertar" },
  { enfermedad: "Narcolepsia", sintomas: "ataques sueño súbitos somnolencia extrema cataplejía debilidad muscular repentina" },
  { enfermedad: "Cefalea tensional", sintomas: "dolor cabeza bilateral ambos lados presión banda aprieta cráneo tensión cuello" },
  { enfermedad: "Vértigo posicional", sintomas: "vértigo mareos girar cabeza cambio posición sensación rotación" },
  { enfermedad: "Enfermedad Menière", sintomas: "vértigo severo episódico tinnitus zumbido oídos pérdida audición náuseas" },
  { enfermedad: "Hipoacusia", sintomas: "dificultad escuchar pérdida audición zumbido oídos sordera parcial" },
  { enfermedad: "Otitis media", sintomas: "dolor oído intenso presión auditiva fiebre dificultad escuchar pus secreción" },
  { enfermedad: "Otitis externa", sintomas: "dolor tocar oreja tirar pabellón picazón canal auditivo secreción oído nadador" },
  { enfermedad: "Cataratas", sintomas: "visión borrosa nublada dificultad luz brillante deslumbramiento colores apagados" },
  { enfermedad: "Glaucoma", sintomas: "dolor ocular intenso visión borrosa halos luces náuseas presión ocular" },
  { enfermedad: "Retinopatía diabética", sintomas: "visión borrosa manchas flotantes puntos negros pérdida visión gradual" },
  { enfermedad: "Miopía", sintomas: "dificultad ver lejos objetos distantes visión borrosa distancia entrecerrar ojos" },
  { enfermedad: "Hipermetropía", sintomas: "dificultad ver cerca objetos cercanos fatiga ocular dolor ojos leer" },
  { enfermedad: "Astigmatismo", sintomas: "visión borrosa distorsionada cualquier distancia fatiga ocular dolor cabeza" },
  { enfermedad: "Conjuntivitis", sintomas: "enrojecimiento ocular ojo rojo picazón lagrimeo secreción legañas pegados párpados" },
  { enfermedad: "Blefaritis", sintomas: "enrojecimiento inflamación párpados picazón ardor costras pestañas" },
  { enfermedad: "Estrabismo", sintomas: "desalineación ojos bizquera visión doble ojos cruzados" },
  { enfermedad: "Alopecia androgénica", sintomas: "pérdida cabello calvicie progresiva adelgazamiento pelo entradas" },
  { enfermedad: "Alopecia areata", sintomas: "pérdida cabello circular parches calvos zonas sin pelo" },
  { enfermedad: "Vitíligo", sintomas: "manchas blancas despigmentadas piel pérdida color pigmento" },
  { enfermedad: "Melasma", sintomas: "manchas oscuras marrones cara hiperpigmentación mejillas frente" },
  { enfermedad: "Rosácea", sintomas: "enrojecimiento facial permanente cara roja vasos visibles capilares" },
  { enfermedad: "Caspa", sintomas: "descamación cuero cabelludo escamas blancas picazón resequedad" },
  { enfermedad: "Piojos", sintomas: "picazón intensa cuero cabelludo liendres huevos rascado constante" },
  { enfermedad: "Sarna", sintomas: "picazón intensa nocturna lesiones lineales surcos piel rascado" },
  { enfermedad: "Pie atleta", sintomas: "picazón intensa dedos pie planta pies descamación piel agrietada olor desagradable ardor hongos dolor caminar pisar" },
  { enfermedad: "Onicomicosis", sintomas: "engrosamiento uñas amarillas decoloración hongos uñas quebradizas" },
  { enfermedad: "Candidiasis oral", sintomas: "manchas blancas lengua boca dolor ardor algodoncillo" },
  { enfermedad: "Candidiasis vaginal", sintomas: "picazón vaginal intensa flujo blanco espeso ardor infección hongos" },
  { enfermedad: "Balanitis", sintomas: "enrojecimiento inflamación glande pene picazón ardor secreción" },
  { enfermedad: "Prostatitis", sintomas: "dolor pelvis perineal dificultad orinar ardor fiebre malestar" },
  { enfermedad: "Infertilidad masculina", sintomas: "dificultad concebir embarazo disfunción eréctil bajo conteo esperma" },
  { enfermedad: "Infertilidad femenina", sintomas: "irregularidades menstruales ciclos anormales dificultad concebir embarazo" },
  { enfermedad: "Fibromas uterinos", sintomas: "períodos menstruales abundantes sangrado excesivo dolor pélvico presión" },
  { enfermedad: "Endometriosis", sintomas: "dolor pélvico intenso períodos abundantes dolorosos cólicos severos" },
  { enfermedad: "Quistes ováricos", sintomas: "dolor pélvico bajo vientre irregularidades menstruales hinchazón abdominal" },
  { enfermedad: "Síndrome ovario poliquístico", sintomas: "irregularidades menstruales acné vello excesivo aumento peso quistes" },
  { enfermedad: "Menopausia", sintomas: "sofocos calores repentinos sudores nocturnos irregularidades menstruales ausencia regla" },
  { enfermedad: "Osteoporosis", sintomas: "fracturas frecuentes huesos frágiles pérdida altura dolor espalda" },
  { enfermedad: "Artrosis", sintomas: "dolor articular rigidez rodillas caderas manos dedos pies pie tobillos tobillo crujido movimiento desgaste dolor caminar pisar apoyo" },
  { enfermedad: "Artritis reumatoide", sintomas: "dolor articular simétrico rigidez matinal prolongada hinchazón articulaciones dedos manos muñecas inflamación" },
  { enfermedad: "Gota", sintomas: "dolor articular súbito muy intenso dedo gordo pie pies tobillo enrojecimiento hinchazón calor articulación ataque nocturno cristales dolor caminar pisar" },
  { enfermedad: "Lupus", sintomas: "erupción facial mariposa mejillas nariz dolor articular fiebre fatiga" },
  { enfermedad: "Esclerodermia", sintomas: "engrosamiento piel dura rigidez dedos cara dificultad tragar" },
  { enfermedad: "Síndrome Sjögren", sintomas: "sequedad extrema ocular bucal ojos secos boca seca dificultad tragar" },
  { enfermedad: "Fibromialgia", sintomas: "dolor muscular generalizado puntos sensibles fatiga crónica rigidez cansancio" },
  { enfermedad: "Polimiositis", sintomas: "debilidad muscular proximal hombros caderas inflamación dificultad subir escaleras" },
  { enfermedad: "Dermatomiositis", sintomas: "debilidad muscular erupción violácea púrpura párpados mejillas inflamación" },
  { enfermedad: "Síndrome fatiga crónica", sintomas: "fatiga severa extrema agotamiento dolor muscular cansancio persistente" },
  { enfermedad: "Enfermedad celíaca", sintomas: "diarrea crónica pérdida peso dolor abdominal hinchazón intolerancia gluten" },
  { enfermedad: "Enfermedad Crohn", sintomas: "diarrea crónica dolor abdominal cólicos pérdida peso sangre heces" },
  { enfermedad: "Colitis ulcerosa", sintomas: "diarrea con sangre mucosa dolor abdominal cólicos urgencia evacuar" },
  { enfermedad: "Síndrome intestino irritable", sintomas: "dolor abdominal cólicos diarrea estreñimiento alternados gases hinchazón" },
  { enfermedad: "Gastroparesia", sintomas: "sensación plenitud saciedad temprana náuseas vómitos digestión lenta" },
  { enfermedad: "Reflujo gastroesofágico", sintomas: "ardor pecho acidez estomacal regurgitación ácida sabor amargo boca dolor epigástrico" },
  { enfermedad: "Úlcera péptica", sintomas: "dolor epigástrico ardor estómago náuseas vómitos sangre heces negras" },
  { enfermedad: "Hepatitis A", sintomas: "ictericia coloración amarilla piel ojos fatiga dolor abdominal náuseas" },
  { enfermedad: "Hepatitis B", sintomas: "ictericia amarillo piel ojos fatiga orina oscura náuseas" },
  { enfermedad: "Hepatitis C", sintomas: "fatiga crónica dolor abdominal ictericia náuseas pérdida apetito" },
  { enfermedad: "Cirrosis hepática", sintomas: "ascitis líquido abdomen ictericia encefalopatía confusión fatiga" },
  { enfermedad: "Colangitis", sintomas: "fiebre escalofríos ictericia dolor cuadrante superior derecho abdomen" },
  { enfermedad: "Cálculos biliares", sintomas: "dolor abdominal superior derecho severo cólico biliar náuseas vómitos" },
  { enfermedad: "Pancreatitis aguda", sintomas: "dolor abdominal superior intenso irradiado espalda náuseas vómitos fiebre" },
  { enfermedad: "Insuficiencia renal crónica", sintomas: "fatiga hinchazón tobillos pies anemia orina espumosa náuseas" },
  { enfermedad: "Insuficiencia renal aguda", sintomas: "reducción orina oliguria hinchazón piernas fatiga confusión" },
  { enfermedad: "Cálculos renales", sintomas: "dolor intenso costado espalda baja cólico renal náuseas hematuria sangre orina" },
  { enfermedad: "Pielonefritis", sintomas: "fiebre alta escalofríos dolor costado espalda disuria ardor orinar" },
  { enfermedad: "Cistitis", sintomas: "ardor orinar disuria frecuencia urinaria urgencia dolor bajo vientre orina turbia olor" },
  { enfermedad: "Uretritis", sintomas: "ardor orinar disuria secreción uretral picazón uretra dolor" },
  { enfermedad: "Prostatismo", sintomas: "dificultad iniciar orinar retención urinaria chorro débil goteo residual" },
  { enfermedad: "Incontinencia urinaria", sintomas: "fugas orina involuntarias goteo pérdida control vejiga" },
  { enfermedad: "Tuberculosis pulmonar", sintomas: "tos persistente más tres semanas hemoptisis sangre esputo pérdida peso sudores nocturnos fiebre" },
  { enfermedad: "Tuberculosis extrapulmonar", sintomas: "linfadenopatía ganglios inflamados fiebre pérdida peso sudores nocturnos" },
  { enfermedad: "Lepra", sintomas: "lesiones piel hipopigmentadas manchas claras anestesia pérdida sensibilidad" },
  { enfermedad: "Malaria", sintomas: "fiebre intermitente cíclica escalofríos intensos sudoración profusa dolor cabeza" },
  { enfermedad: "Dengue", sintomas: "fiebre muy alta repentina dolor retrorbitario ojos exantema sarpullido dolor articular" },
  { enfermedad: "Fiebre amarilla", sintomas: "fiebre alta ictericia coloración amarilla hemorragia sangrado náuseas" },
  { enfermedad: "Zika", sintomas: "fiebre leve exantema sarpullido conjuntivitis ojos rojos dolor articular" },
  { enfermedad: "Viruela simio", sintomas: "lesiones vesículas piel fiebre linfadenopatía ganglios inflamados erupción" },
  { enfermedad: "COVID-19", sintomas: "tos seca fiebre pérdida olfato gusto fatiga dificultad respirar dolor garganta" },
  { enfermedad: "Sarampión", sintomas: "fiebre alta erupción maculopapular manchas rojas tos conjuntivitis" },
  { enfermedad: "Rubéola", sintomas: "erupción rosada sarpullido leve fiebre baja ganglios inflamados" },
  { enfermedad: "Varicela", sintomas: "vesículas ampollas fiebre comezón intensa sarpullido costras" },
  { enfermedad: "Herpes zóster", sintomas: "vesículas ampollas unilateral dermatoma banda dolor neuropático ardor intenso" },
  { enfermedad: "Herpes simple", sintomas: "vesículas ampollas labios boca genital dolor ardor picazón" },
  { enfermedad: "VIH/SIDA", sintomas: "linfadenopatía ganglios inflamados fiebre persistente sudores nocturnos pérdida peso" },
  { enfermedad: "Mononucleosis", sintomas: "fiebre persistente faringitis dolor garganta linfadenopatía ganglios cuello fatiga" },
  { enfermedad: "Paperas", sintomas: "hinchazón inflamación glándulas salivales parótidas fiebre dolor mandíbula" },
  { enfermedad: "Tos ferina", sintomas: "ataques tos violentos paroxísticos estridor inspiratorio sonido silbido" },
  { enfermedad: "Difteria", sintomas: "membrana gris pseudodiftérica garganta dificultad respirar tragar fiebre" },
  { enfermedad: "Tétanos", sintomas: "rigidez muscular trismo mandíbula cerrada convulsiones espasmos musculares" },
  { enfermedad: "Poliomielitis", sintomas: "fiebre parálisis flácida debilidad muscular asimétrica dificultad mover extremidades" },
  { enfermedad: "Rabia", sintomas: "hidrofobia miedo agua alucinaciones agresividad parálisis convulsiones" },
  { enfermedad: "Gonorrea", sintomas: "secreción uretral purulenta amarilla verdosa ardor orinar disuria" },
  { enfermedad: "Sífilis", sintomas: "úlcera indurada chancro indolora exantema sarpullido palmas plantas" },
  { enfermedad: "Clamidia", sintomas: "secreción uretral clara ardor orinar disuria cervicitis dolor pélvico" },
  { enfermedad: "Fascitis plantar", sintomas: "dolor intenso talón planta pie primeros pasos mañana punzante caminar dificultad pisar" },
  { enfermedad: "Esguince tobillo", sintomas: "dolor tobillo hinchazón inflamación moretón morado dificultad caminar apoyo pie torcedura" },
  { enfermedad: "Tendinitis", sintomas: "dolor tendón movimiento inflamación rigidez debilidad muñeca codo hombro tobillo rodilla" }
];

// ====================== ENTRENAR SOLO 2 ALGORITMOS ======================

// 1. NAIVE BAYES
const { BayesClassifier } = natural;
const nbClassifier = new BayesClassifier();
diagnosticos.forEach(({ enfermedad, sintomas }) => {
  nbClassifier.addDocument(sintomas, enfermedad);
});
nbClassifier.train();
console.log('✅ Naive Bayes entrenado');

// 2. LOGISTIC REGRESSION
const { LogisticRegressionClassifier } = natural;
const lrClassifier = new LogisticRegressionClassifier();
diagnosticos.forEach(({ enfermedad, sintomas }) => {
  lrClassifier.addDocument(sintomas, enfermedad);
});
lrClassifier.train();
console.log('✅ Logistic Regression entrenado');

console.log(`\n🎯 Sistema listo con 2 algoritmos supervisados y ${diagnosticos.length} enfermedades\n`);

// ====================== AUTENTICACIÓN ======================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const existente = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existente.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const nuevoUsuario = result.rows[0];

    const token = jwt.sign(
      { id: nuevoUsuario.id, email: nuevoUsuario.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: nuevoUsuario
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const usuario = result.rows[0];

    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: usuario.id,
        name: usuario.name,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// ====================== DIAGNÓSTICO CON 2 ALGORITMOS ======================

// ====================== DIAGNÓSTICO CON 2 ALGORITMOS ======================

app.post('/api/diagnostico', (req, res) => {
  const { sintomas } = req.body;

  if (!sintomas || !Array.isArray(sintomas) || sintomas.length === 0) {
    return res.status(400).json({
      error: "Envía array de síntomas"
    });
  }

  const texto = sintomas.join(" ");
  console.log('📝 Texto recibido:', texto);

  // 1. NAIVE BAYES
  const nbPredicciones = nbClassifier.getClassifications(texto);
  const nbTop = nbPredicciones[0];
  
  // 2. LOGISTIC REGRESSION
  const lrPredicciones = lrClassifier.getClassifications(texto);
  const lrTop = lrPredicciones[0];

  console.log('🎯 Predicciones:');
  console.log(`  Naive Bayes: ${nbTop.label} (${(nbTop.value * 100).toFixed(1)}%)`);
  console.log(`  Logistic Regression: ${lrTop.label} (${(lrTop.value * 100).toFixed(1)}%)`);

  // ✅ NUEVA LÓGICA: Si coinciden, promediar; si no, elegir el más confiable
  let diagnosticoFinal;
  let confianzaFinal;
  let votosAlgoritmos;

  if (nbTop.label === lrTop.label) {
    // Caso 1: Ambos algoritmos coinciden → Promediar confianzas
    diagnosticoFinal = nbTop.label;
    confianzaFinal = Math.round(((nbTop.value + lrTop.value) / 2) * 100);
    votosAlgoritmos = 2;
    console.log(`✅ Coincidencia: ${diagnosticoFinal} (promedio: ${confianzaFinal}%)`);
  } else {
    // Caso 2: No coinciden → Elegir el de MAYOR CONFIANZA
    if (nbTop.value > lrTop.value) {
      diagnosticoFinal = nbTop.label;
      confianzaFinal = Math.round(nbTop.value * 100);
      votosAlgoritmos = 1;
      console.log(`⚠️ Ganador: Naive Bayes con ${confianzaFinal}%`);
    } else {
      diagnosticoFinal = lrTop.label;
      confianzaFinal = Math.round(lrTop.value * 100);
      votosAlgoritmos = 1;
      console.log(`⚠️ Ganador: Logistic Regression con ${confianzaFinal}%`);
    }
  }

  // FUNCIÓN PARA BUSCAR SÍNTOMAS
  const buscarSintomas = (nombreEnfermedad) => {
    const enfermedad = diagnosticos.find(d => d.enfermedad === nombreEnfermedad);
    if (enfermedad) {
      return enfermedad.sintomas
        .split(' ')
        .filter(s => s.length > 3)
        .slice(0, 4)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1));
    }
    return ['Síntomas no disponibles'];
  };

  // Alternativas
  const alternativas = nbPredicciones
    .slice(1, 4)
    .map(p => ({
      diagnostico: p.label,
      confianza: Math.round(p.value * 100),
      sintomas: buscarSintomas(p.label)
    }));

  res.json({
    diagnostico: diagnosticoFinal,
    confianza: confianzaFinal,
    votos: votosAlgoritmos,
    sintomas_enfermedad: buscarSintomas(diagnosticoFinal),
    
    algoritmos: [
      {
        nombre: "Naive Bayes",
        prediccion: nbTop.label,
        confianza: Math.round(nbTop.value * 100)
      },
      {
        nombre: "Logistic Regression",
        prediccion: lrTop.label,
        confianza: Math.round(lrTop.value * 100)
      }
    ],
    
    alternativas,
    sintomas: texto
  });
});



// ====================== SERVIDOR ======================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 AsistMedic: http://localhost:${PORT}`);
  console.log(`📡 POST /api/auth/register`);
  console.log(`📡 POST /api/auth/login`);
  console.log(`📡 POST /api/diagnostico`);
  console.log(`🤖 Algoritmos: Naive Bayes + Logistic Regression`);
});
