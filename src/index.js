import express from 'express';
import cors from 'cors';
import natural from 'natural';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'mi-secreto-super-seguro-2024';

// ========================================
// NORMALIZAR TEXTO
// ========================================
const normalizarTexto = (texto) => {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ========================================
// BASE DE DATOS DE DIAGNÓSTICOS
// ========================================
const diagnosticos = [
  // MIGRAÑA
  { enfermedad: "Migraña", sintomas: "dolor cabeza intenso pulsante late martillazo lado cabeza empeora luz sonido nauseas vomitos dura horas dias" },
  { enfermedad: "Migraña", sintomas: "duele horrible cabeza lado derecho late fuerte soporto luz ruido ganas vomitar" },
  { enfermedad: "Migraña", sintomas: "dolor cabeza intenso lado izquierdo late mucho luz molesta nauseas" },
  { enfermedad: "Migraña", sintomas: "dolor cabeza pulsante unilateral fotofobia fonofobia nauseas vomitos aura visual" },
  
  // CEFALEA TENSIONAL
  { enfermedad: "Cefalea tensional", sintomas: "dolor cabeza ambos lados banda aprieta presion constante late mejora descanso estres tension cuello hombros" },
  { enfermedad: "Cefalea tensional", sintomas: "duele cabeza dos lados presion banda apretada late mejora descanso" },
  { enfermedad: "Cefalea tensional", sintomas: "dolor cabeza bilateral presion tension cuello fotofobia nauseas leve moderado" },
  
  // SINUSITIS
  { enfermedad: "Sinusitis aguda", sintomas: "dolor cabeza frontal presion facial congestion nasal secrecion amarilla verdosa moco espeso dolor mejillas frente pomulos fiebre" },
  { enfermedad: "Sinusitis aguda", sintomas: "duele frente pomulos nariz tapada moco amarillo verdoso presion cara" },
  { enfermedad: "Sinusitis aguda", sintomas: "presion facial dolor senos paranasales congestion nasal secrecion purulenta fiebre dolor aumenta inclinar cabeza" },
  
  // GRIPE
  { enfermedad: "Gripe", sintomas: "fiebre alta escalofrios intensos dolor cuerpo musculos articulaciones fatiga extrema tos seca garganta irritada congestion nasal inicio subito" },
  { enfermedad: "Gripe", sintomas: "mucha fiebre escalofrios duele cuerpo cansado tos seca duele garganta" },
  { enfermedad: "Gripe", sintomas: "fiebre alta repente duelen musculos articulaciones tos seca cansancio escalofrios" },
  { enfermedad: "Gripe", sintomas: "fiebre elevada dolor muscular generalizado malestar general tos seca faringitis congestion inicio brusco" },
  
  // RESFRIADO COMÚN
  { enfermedad: "Resfriado común", sintomas: "congestion nasal moqueo transparente acuoso estornudos frecuentes tos leve dolor garganta leve fiebre alta inicio gradual sintomas leves moderados" },
  { enfermedad: "Resfriado común", sintomas: "nariz tapada moco transparente estornudo mucho tos ligera duele poco garganta fiebre alta empezo poco" },
  { enfermedad: "Resfriado común", sintomas: "rinorrea clara estornudos tos leve odinofagia leve afebril inicio progresivo" },
  
  // COVID-19
  { enfermedad: "COVID-19", sintomas: "fiebre tos seca persistente perdida total olfato gusto anosmia ageusia huelo nada siento sabores dificultad respirar falta aire disnea fatiga dolor garganta" },
  { enfermedad: "COVID-19", sintomas: "fiebre tos seca puedo oler nada siento sabores comida cuesta respirar falta aire cansado" },
  { enfermedad: "COVID-19", sintomas: "tos seca fiebre perdida olfato gusto dificultad respiratoria fatiga mialgias cefalea" },
  
  // GASTROENTERITIS
  { enfermedad: "Gastroenteritis", sintomas: "diarrea liquida frecuente dolor abdominal estomago barriga colicos retortijones nauseas vomitos deshidratacion sed excesiva debilidad fiebre leve escalofrios" },
  { enfermedad: "Gastroenteritis", sintomas: "diarrea liquida varias veces duele estomago colicos retortijones nauseas vomite sed debilidad frio" },
  { enfermedad: "Gastroenteritis", sintomas: "duele estomago diarrea nauseas escalofrios fiebre baja dolor abdominal colicos" },
  { enfermedad: "Gastroenteritis", sintomas: "dolor abdominal diarrea acuosa nauseas vomitos fiebre leve deshidratacion malestar general" },
  
  // FARINGITIS
  { enfermedad: "Faringitis", sintomas: "dolor garganta intenso ardor tragar dificultad deglutir odinofagia amigdalas inflamadas rojas fiebre ganglios cuello inflamados" },
  { enfermedad: "Faringitis", sintomas: "duele mucho garganta tragar amigdalas rojas inflamadas fiebre ganglios cuello hinchados" },
  { enfermedad: "Faringitis", sintomas: "odinofagia intensa eritema faringeo adenopatias cervicales fiebre disfagia" },
  
  // BRONQUITIS
  { enfermedad: "Bronquitis", sintomas: "tos persistente productiva flema expectoracion mucosidad amarilla verdosa dificultad respirar silbido pecho sibilancias dolor toracico toser" },
  { enfermedad: "Bronquitis", sintomas: "tos mucha flema verde amarilla silba pecho duele toser dificultad respirar" },
  { enfermedad: "Bronquitis", sintomas: "tos productiva expectoracion purulenta sibilancias disnea dolor toracico" },
  
  // NEUMONÍA
  { enfermedad: "Neumonía", sintomas: "fiebre muy alta treinta nueve grados tos productiva flema amarilla verdosa herrumbrosa dolor pecho respirar dificultad respiratoria disnea escalofrios intensos" },
  { enfermedad: "Neumonía", sintomas: "fiebre muy alta treinta nueve tos flema amarilla duele pecho respirar falta aire escalofrios fuertes" },
  { enfermedad: "Neumonía", sintomas: "fiebre elevada tos productiva esputo purulento dolor pleuritico disnea escalofrios" },
  
  // ASMA
  { enfermedad: "Asma", sintomas: "dificultad respirar severa silbido pecho sibilancias tos seca nocturna opresion toracica pecho apretado falta aire crisis respiratoria" },
  { enfermedad: "Asma", sintomas: "cuesta respirar silba pecho pecho apretado falta aire tos seca noche" },
  { enfermedad: "Asma", sintomas: "disnea sibilancias tos nocturna opresion toracica broncoespasmo" },
  
  // INFARTO MIOCARDIO
  { enfermedad: "Infarto miocardio", sintomas: "dolor pecho intenso opresion peso elefante aplastante irradia brazo izquierdo mandibula cuello espalda sudoracion fria profusa nauseas vomitos dificultad respirar disnea sensacion muerte inminente" },
  { enfermedad: "Infarto miocardio", sintomas: "dolor fuerte pecho aplastara duele brazo izquierdo mandibula sudo frio nauseas falta aire voy morir" },
  { enfermedad: "Infarto miocardio", sintomas: "dolor toracico opresivo irradiado miembro superior izquierdo diaforesis fria nauseas disnea ansiedad" },
  
  // ANGINA PECHO
  { enfermedad: "Angina pecho", sintomas: "dolor pecho presion opresion durante esfuerzo fisico ejercicio irradia brazo izquierdo mejora reposo dura pocos minutos dificultad respirar" },
  { enfermedad: "Angina pecho", sintomas: "duele pecho presion hago ejercicio duele brazo izquierdo mejora descanso" },
  { enfermedad: "Angina pecho", sintomas: "dolor toracico opresivo desencadenado esfuerzo irradiado alivio reposo" },
  
  // ANSIEDAD
  { enfermedad: "Ansiedad", sintomas: "palpitaciones corazon acelerado taquicardia sudoracion profusa manos temblorosas temblor sensacion falta aire hiperventilacion opresion pecho mareo vertigo miedo intenso panico causa aparente preocupacion excesiva" },
  { enfermedad: "Ansiedad", sintomas: "corazon late rapido sudo mucho tiemblan manos siento falta aire opresion pecho miedo panico razon" },
  { enfermedad: "Ansiedad", sintomas: "taquicardia sudoracion temblor disnea opresion toracica mareo panico preocupacion" },
  
  // DEPRESIÓN
  { enfermedad: "Depresión", sintomas: "tristeza profunda persistente semanas falta interes actividades antes disfrutaba anhedonia fatiga cansancio extremo insomnio hipersomnia perdida apetito peso pensamientos muerte suicidas" },
  { enfermedad: "Depresión", sintomas: "siento triste tiempo ganas hacer nada disfruto antes gustaba siempre cansado puedo dormir duermo mucho apetito" },
  { enfermedad: "Depresión", sintomas: "animo deprimido persistente anhedonia astenia insomnio anorexia ideacion suicida" },
  
  // DIABETES TIPO 2
  { enfermedad: "Diabetes tipo 2", sintomas: "sed excesiva polidipsia mucha sed miccion frecuente poliuria orinar mucho vision borrosa cansancio fatiga heridas tardan cicatrizar infecciones frecuentes" },
  { enfermedad: "Diabetes tipo 2", sintomas: "mucha sed tiempo orino mucho veo borroso cansado heridas tardan sanar" },
  { enfermedad: "Diabetes tipo 2", sintomas: "polidipsia poliuria vision borrosa astenia cicatrizacion lenta infecciones recurrentes" },
  
  // HIPERTENSIÓN
  { enfermedad: "Hipertensión", sintomas: "dolor cabeza occipital nuca mareos vertigo zumbido oidos tinnitus vision borrosa palpitaciones presion arterial alta ciento cuarenta noventa" },
  { enfermedad: "Hipertensión", sintomas: "duele cabeza nuca mareos zumbido oidos veo borroso palpitaciones" },
  { enfermedad: "Hipertensión", sintomas: "cefalea occipital mareos tinnitus vision borrosa palpitaciones" },
  
  // HIPOTENSIÓN
  { enfermedad: "Hipotensión", sintomas: "mareos frecuentes vertigo debilidad fatiga desmayo sincope vision borrosa presion arterial baja menos noventa sesenta" },
  { enfermedad: "Hipotensión", sintomas: "muchos mareos siento debil muy cansado veo borroso desmayado" },
  { enfermedad: "Hipotensión", sintomas: "mareos sincope astenia vision borrosa hipotension" },
  
  // ARTRITIS REUMATOIDE
  { enfermedad: "Artritis reumatoide", sintomas: "dolor articular simetrico ambas manos munecas rodillas rigidez matinal prolongada hora hinchazon articulaciones calor enrojecimiento inflamacion dedos deformidad" },
  { enfermedad: "Artritis reumatoide", sintomas: "duelen articulaciones ambas manos munecas igual amanezco manos rigidas hora hinchadas rojas calientes" },
  { enfermedad: "Artritis reumatoide", sintomas: "dolor articular simetrico rigidez matinal prolongada tumefaccion articular deformidades" },
  
  // ARTROSIS
  { enfermedad: "Artrosis", sintomas: "dolor articular mecanico rodillas caderas manos dedos pies tobillos empeora movimiento actividad mejora reposo rigidez breve menos treinta minutos crujido articular crepitacion" },
  { enfermedad: "Artrosis", sintomas: "duelen rodillas caderas camino hago actividad mejora descanso rigidez manana dura poco articulaciones crujen" },
  { enfermedad: "Artrosis", sintomas: "dolor articular mecanico rigidez breve crepitacion limitacion movilidad" },
  
  // GOTA
  { enfermedad: "Gota", sintomas: "dolor articular subito muy intenso insoportable dedo gordo pie podagra generalmente nocturno enrojecimiento intenso hinchazon marcada calor articulacion afectada puedo tocar apoyar cristales acido urico" },
  { enfermedad: "Gota", sintomas: "desperto dolor horrible dedo gordo pie insoportable muy rojo hinchado caliente puedo tocarlo apoyar pie" },
  { enfermedad: "Gota", sintomas: "dolor articular agudo severo dedo gordo pie eritema edema calor nocturno" },
  
  // CISTITIS
  { enfermedad: "Cistitis", sintomas: "ardor intenso orinar disuria frecuencia urinaria necesidad urgente orinar urgencia dolor bajo vientre hipogastrio orina turbia mal olor veces sangre hematuria" },
  { enfermedad: "Cistitis", sintomas: "arde horrible orinar bano rato urgencia duele bajo ombligo orina turbia huele mal" },
  { enfermedad: "Cistitis", sintomas: "disuria polaquiuria urgencia urinaria dolor suprapubico orina turbia" },
  
  // PIELONEFRITIS
  { enfermedad: "Pielonefritis", sintomas: "fiebre alta treinta ocho escalofrios intensos dolor costado espalda baja lumbar unilateral ardor orinar disuria nauseas vomitos malestar general" },
  { enfermedad: "Pielonefritis", sintomas: "fiebre alta escalofrios duele costado espalda baja arde orinar nauseas" },
  { enfermedad: "Pielonefritis", sintomas: "fiebre escalofrios dolor lumbar disuria nauseas puno percusion positiva" },
  
  // PANCREATITIS AGUDA
  { enfermedad: "Pancreatitis aguda", sintomas: "dolor abdominal superior epigastrio muy intenso penetrante irradia espalda cinturon nauseas vomitos abundantes fiebre distension abdominal empeora acostarse mejora sentarse inclinado adelante" },
  { enfermedad: "Pancreatitis aguda", sintomas: "duele horrible parte alta estomago penetrante hacia espalda cinturon muchas nauseas vomito mucho fiebre mejora siento inclinado adelante" },
  { enfermedad: "Pancreatitis aguda", sintomas: "dolor epigastrico intenso irradiado dorsal nauseas vomitos fiebre distension" },
  
  // APENDICITIS
  { enfermedad: "Apendicitis", sintomas: "dolor abdominal inicio periumbilical alrededor ombligo luego migra fosa iliaca derecha parte baja derecha abdomen nauseas vomitos fiebre perdida apetito dolor aumenta movimiento tos" },
  { enfermedad: "Apendicitis", sintomas: "empezo dolor ombligo ahora baja derecha abdomen nauseas fiebre hambre duele moverme toser" },
  { enfermedad: "Apendicitis", sintomas: "dolor periumbilical migra fosa iliaca derecha nauseas vomitos fiebre anorexia" },
  
  // DERMATITIS ATÓPICA
  { enfermedad: "Dermatitis atópica", sintomas: "picazon intensa prurito insoportable enrojecimiento piel eritema erupciones eccema sarpullido resequedad descamacion xerosis" },
  { enfermedad: "Dermatitis atópica", sintomas: "pica mucho piel roja erupciones sarpullido seca descama" },
  { enfermedad: "Dermatitis atópica", sintomas: "prurito intenso eritema erupciones xerosis eccema" },
  
  // PSORIASIS
  { enfermedad: "Psoriasis", sintomas: "enrojecimiento piel placas eritematosas descamacion escamas blancas plateadas gruesas placas bien definidas" },
  { enfermedad: "Psoriasis", sintomas: "piel roja placas descamacion escamas blancas gruesas" },
  { enfermedad: "Psoriasis", sintomas: "placas eritematosas escamas plateadas bien delimitadas" },
  
  // ACNÉ
  { enfermedad: "Acné", sintomas: "espinillas comedones puntos negros enrojecimiento facial granos pustulas papulas cara pecho espalda" },
  { enfermedad: "Acné", sintomas: "espinillas puntos negros granos cara enrojecimiento pecho espalda" },
  { enfermedad: "Acné", sintomas: "comedones pustulas papulas eritema facial" },
  
  // ALERGIA ESTACIONAL
  { enfermedad: "Alergia estacional", sintomas: "estornudos frecuentes congestion nasal rinorrea picazon ocular prurito ojos lagrimeo epifora rinitis" },
  { enfermedad: "Alergia estacional", sintomas: "estornudo mucho nariz tapada pican ojos lagrimean moqueo" },
  { enfermedad: "Alergia estacional", sintomas: "rinitis estornudos rinorrea prurito ocular lagrimeo" },
  
  // URTICARIA
  { enfermedad: "Urticaria", sintomas: "ronchas habones picazon intensa prurito enrojecimiento piel lesiones elevadas reaccion alergica" },
  { enfermedad: "Urticaria", sintomas: "ronchas piel pican mucho rojas elevadas" },
  { enfermedad: "Urticaria", sintomas: "habones prurito intenso eritema lesiones elevadas" },
  
  // CONJUNTIVITIS
  { enfermedad: "Conjuntivitis", sintomas: "enrojecimiento ocular ojo rojo hiperemia conjuntival picazon lagrimeo secrecion leganas parpados pegados" },
  { enfermedad: "Conjuntivitis", sintomas: "ojo rojo pica lagrimea secrecion leganas parpados pegados" },
  { enfermedad: "Conjuntivitis", sintomas: "hiperemia conjuntival prurito lagrimeo secrecion" },
  
  // MIOPÍA
  { enfermedad: "Miopía", sintomas: "dificultad ver lejos objetos distantes vision borrosa distancia entrecerrar ojos para enfocar" },
  { enfermedad: "Miopía", sintomas: "veo borroso lejos entrecierro ojos enfocar distancia" },
  { enfermedad: "Miopía", sintomas: "vision borrosa lejana dificultad ver distancia" },
  
  // OTITIS MEDIA
  { enfermedad: "Otitis media", sintomas: "dolor oido intenso otalgia presion auditiva fiebre dificultad escuchar secrecion purulenta pus" },
  { enfermedad: "Otitis media", sintomas: "duele mucho oido presion fiebre escucho mal secrecion pus" },
  { enfermedad: "Otitis media", sintomas: "otalgia intensa fiebre hipoacusia secrecion purulenta" },
  
  // VÉRTIGO POSICIONAL
  { enfermedad: "Vértigo posicional", sintomas: "vertigo intenso mareos severos girar cabeza cambio posicion sensacion rotacion habitacion gira" },
  { enfermedad: "Vértigo posicional", sintomas: "mareo intenso giro cabeza cambio posicion habitacion gira" },
  { enfermedad: "Vértigo posicional", sintomas: "vertigo posicional mareo cambios posturales" },
  
  // INSOMNIO
  { enfermedad: "Insomnio", sintomas: "dificultad conciliar sueno tardar dormir despertar frecuente noche despertares multiples cansancio diurno fatiga irritabilidad" },
  { enfermedad: "Insomnio", sintomas: "puedo dormir despierto mucho noche cansado dia irritable" },
  { enfermedad: "Insomnio", sintomas: "dificultad conciliar sueno despertares nocturnos fatiga diurna" },
  
  // HERPES ZÓSTER
  { enfermedad: "Herpes zóster", sintomas: "vesiculas ampollas dolorosas unilateral solo lado dermatoma banda distribucion dolor neuropatico ardor intenso quemazon antes aparicion lesiones" },
  { enfermedad: "Herpes zóster", sintomas: "ampollas dolorosas lado banda arde mucho quema antes salieron" },
  { enfermedad: "Herpes zóster", sintomas: "vesiculas unilaterales dolor neuropatico ardor dermatoma" },
  
  // VARICELA
  { enfermedad: "Varicela", sintomas: "vesiculas ampollas diseminadas todo cuerpo fiebre comezon intensa prurito sarpullido erupcion costras" },
  { enfermedad: "Varicela", sintomas: "ampollas todo cuerpo fiebre pica mucho sarpullido costras" },
  { enfermedad: "Varicela", sintomas: "exantema vesicular generalizado fiebre prurito costras" },
  
  // HEPATITIS A
  { enfermedad: "Hepatitis A", sintomas: "ictericia coloracion amarilla piel ojos fatiga intensa dolor abdominal cuadrante superior derecho nauseas vomitos orina oscura coluria heces claras acolia" },
  { enfermedad: "Hepatitis A", sintomas: "piel ojos amarillos cansancio duele lado derecho arriba nauseas orina oscura heces claras" },
  { enfermedad: "Hepatitis A", sintomas: "ictericia fatiga dolor hipocondrio derecho coluria acolia" },
  
  // CIRROSIS HEPÁTICA
  { enfermedad: "Cirrosis hepática", sintomas: "ascitis liquido abdomen distension abdominal ictericia coloracion amarilla encefalopatia confusion mental fatiga edema piernas" },
  { enfermedad: "Cirrosis hepática", sintomas: "abdomen hinchado liquido amarillo piel ojos confusion cansado piernas hinchadas" },
  { enfermedad: "Cirrosis hepática", sintomas: "ascitis ictericia encefalopatia edema fatiga" },
  
  // REFLUJO GASTROESOFÁGICO
  { enfermedad: "Reflujo gastroesofágico", sintomas: "ardor pecho retroesternal pirosis acidez estomacal regurgitacion acida sabor amargo boca dolor epigastrico empeora acostarse" },
  { enfermedad: "Reflujo gastroesofágico", sintomas: "arde pecho acidez estomago sabor amargo boca empeora acostarme" },
  { enfermedad: "Reflujo gastroesofágico", sintomas: "pirosis regurgitacion acida dolor retroesternal empeora decubito" },
  
  // ÚLCERA PÉPTICA
  { enfermedad: "Úlcera péptica", sintomas: "dolor epigastrico ardor estomago hambre dolorosa mejora comer empeora horas despues nauseas vomitos sangre heces negras melena" },
  { enfermedad: "Úlcera péptica", sintomas: "arde estomago hambre duele mejora como empeora horas nauseas heces negras" },
  { enfermedad: "Úlcera péptica", sintomas: "dolor epigastrico ardor mejora ingesta melena" },
  
  // ENFERMEDAD CELÍACA
  { enfermedad: "Enfermedad celíaca", sintomas: "diarrea cronica persistente perdida peso adelgazamiento dolor abdominal hinchazon distension intolerancia gluten trigo cebada" },
  { enfermedad: "Enfermedad celíaca", sintomas: "diarrea siempre bajo peso duele abdomen hinchado como gluten trigo" },
  { enfermedad: "Enfermedad celíaca", sintomas: "diarrea cronica perdida peso distension intolerancia gluten" },
  
  // SÍNDROME INTESTINO IRRITABLE
  { enfermedad: "Síndrome intestino irritable", sintomas: "dolor abdominal colicos diarrea estrenimiento alternados cambios habito intestinal gases hinchazon distension mejora defecar" },
  { enfermedad: "Síndrome intestino irritable", sintomas: "duele abdomen veces diarrea veces estrenido muchos gases hinchado mejora defecar" },
  { enfermedad: "Síndrome intestino irritable", sintomas: "dolor abdominal alteracion habito intestinal distension mejora defecacion" },
  
  // CÁLCULOS RENALES
  { enfermedad: "Cálculos renales", sintomas: "dolor intenso costado espalda baja lumbar colico renal insoportable ondulante nauseas vomitos hematuria sangre orina" },
  { enfermedad: "Cálculos renales", sintomas: "dolor horrible costado espalda baja ondas insoportable nauseas sangre orina" },
  { enfermedad: "Cálculos renales", sintomas: "colico renal dolor lumbar intenso hematuria nauseas" },
  
  // INSUFICIENCIA RENAL CRÓNICA
  { enfermedad: "Insuficiencia renal crónica", sintomas: "fatiga extrema hinchazon tobillos pies edema anemia palidez orina espumosa proteinuria nauseas perdida apetito" },
  { enfermedad: "Insuficiencia renal crónica", sintomas: "cansancio extremo tobillos pies hinchados palido orina espuma nauseas apetito" },
  { enfermedad: "Insuficiencia renal crónica", sintomas: "fatiga edema anemia orina espumosa nauseas" },
  
  // OSTEOPOROSIS
  { enfermedad: "Osteoporosis", sintomas: "fracturas frecuentes espontaneas huesos fragiles perdida altura estatura dolor espalda cronico" },
  { enfermedad: "Osteoporosis", sintomas: "fracturo facil huesos fragiles perdi estatura duele espalda siempre" },
  { enfermedad: "Osteoporosis", sintomas: "fracturas espontaneas huesos fragiles perdida estatura" },
  
  // FIBROMIALGIA
  { enfermedad: "Fibromialgia", sintomas: "dolor muscular generalizado todo cuerpo puntos sensibles dolorosos fatiga cronica rigidez matinal cansancio sueno reparador" },
  { enfermedad: "Fibromialgia", sintomas: "duele todo cuerpo puntos dolorosos siempre cansado rigido manana duermo bien" },
  { enfermedad: "Fibromialgia", sintomas: "dolor muscular generalizado puntos dolorosos fatiga rigidez" },
  
  // LUPUS
  { enfermedad: "Lupus", sintomas: "erupcion facial forma mariposa mejillas nariz eritema malar dolor articular fiebre fatiga fotosensibilidad" },
  { enfermedad: "Lupus", sintomas: "erupcion cara mariposa mejillas nariz duelen articulaciones fiebre cansado sol empeora" },
  { enfermedad: "Lupus", sintomas: "eritema malar artralgia fiebre fatiga fotosensibilidad" },
  
  // EPILEPSIA
  { enfermedad: "Epilepsia", sintomas: "convulsiones crisis convulsiva perdida consciencia desmayo temblores sacudidas movimientos involuntarios espasmos" },
  { enfermedad: "Epilepsia", sintomas: "convulsiones pierdo consciencia desmayo tiemblo sacudidas movimientos controlar" },
  { enfermedad: "Epilepsia", sintomas: "crisis convulsivas perdida consciencia movimientos tonicoclonicos" },
  
  // PARKINSON
  { enfermedad: "Parkinson", sintomas: "temblor manos reposo rigidez muscular lentitud movimiento bradicinesia dificultad caminar marcha arrastrando pies" },
  { enfermedad: "Parkinson", sintomas: "tiemblan manos quieto rigido muevo lento dificultad caminar arrastro pies" },
  { enfermedad: "Parkinson", sintomas: "temblor reposo rigidez bradicinesia marcha parkinsoniana" },
  
  // ALZHEIMER
  { enfermedad: "Alzheimer", sintomas: "perdida memoria reciente olvidos frecuentes confusion mental desorientacion tiempo lugar dificultad reconocer personas familiares" },
  { enfermedad: "Alzheimer", sintomas: "olvido cosas recientes confundo tiempo lugar reconozco personas familiares" },
  { enfermedad: "Alzheimer", sintomas: "deterioro cognitivo perdida memoria confusion desorientacion" },
  
  // ACCIDENTE CEREBROVASCULAR
  { enfermedad: "Accidente cerebrovascular", sintomas: "debilidad repentina subita cara brazo pierna solo lado asimetria facial dificultad hablar disartria mareos confusion perdida equilibrio" },
  { enfermedad: "Accidente cerebrovascular", sintomas: "repente debil cara brazo pierna lado torcida cara hablar bien mareado confuso equilibrio" },
  { enfermedad: "Accidente cerebrovascular", sintomas: "hemiparesia subita asimetria facial disartria confusion ataxia" },
  
  // TUBERCULOSIS PULMONAR
  { enfermedad: "Tuberculosis pulmonar", sintomas: "tos persistente tres semanas hemoptisis sangre esputo perdida peso adelgazamiento sudores nocturnos profusos fiebre vespertina" },
  { enfermedad: "Tuberculosis pulmonar", sintomas: "tos tres semanas sangre flema bajo peso sudo mucho noche fiebre tarde" },
  { enfermedad: "Tuberculosis pulmonar", sintomas: "tos cronica hemoptisis perdida peso sudores nocturnos fiebre" },
  
  // MALARIA
  { enfermedad: "Malaria", sintomas: "fiebre intermitente ciclica cada cuarenta ocho setenta dos horas escalofrios intensos temblores sudoracion profusa dolor cabeza" },
  { enfermedad: "Malaria", sintomas: "fiebre cada dos tres dias escalofrios intensos tiemblo sudo mucho duele cabeza" },
  { enfermedad: "Malaria", sintomas: "fiebre ciclica escalofrios sudoracion profusa cefalea" },
  
  // DENGUE
  { enfermedad: "Dengue", sintomas: "fiebre muy alta repentina quebrantahuesos dolor retrorbitario detras ojos exantema sarpullido dolor articular muscular intenso" },
  { enfermedad: "Dengue", sintomas: "fiebre muy alta repente duelen huesos detras ojos sarpullido duelen articulaciones musculos" },
  { enfermedad: "Dengue", sintomas: "fiebre alta quebrantahuesos dolor retrorbitario exantema mialgias" },
  
  // VIH/SIDA
  { enfermedad: "VIH/SIDA", sintomas: "linfadenopatia ganglios inflamados persistentes fiebre prolongada mes sudores nocturnos perdida peso involuntaria fatiga infecciones oportunistas" },
  { enfermedad: "VIH/SIDA", sintomas: "ganglios inflamados fiebre mes sudo noche bajo peso involuntario cansado infecciones frecuentes" },
  { enfermedad: "VIH/SIDA", sintomas: "linfadenopatia fiebre prolongada sudores nocturnos perdida peso fatiga" },
  
  // MONONUCLEOSIS
  { enfermedad: "Mononucleosis", sintomas: "fiebre persistente prolongada faringitis dolor garganta intenso linfadenopatia ganglios cuello muy inflamados fatiga extrema esplenomegalia" },
  { enfermedad: "Mononucleosis", sintomas: "fiebre mucho tiempo duele garganta intenso ganglios cuello hinchados cansado extremo" },
  { enfermedad: "Mononucleosis", sintomas: "fiebre prolongada faringitis linfadenopatia fatiga esplenomegalia" },
  
  // GONORREA
  { enfermedad: "Gonorrea", sintomas: "secrecion uretral purulenta amarilla verdosa espesa abundante ardor orinar disuria hombres pene mujeres flujo vaginal" },
  { enfermedad: "Gonorrea", sintomas: "secrecion pene amarilla verdosa espesa arde orinar" },
  { enfermedad: "Gonorrea", sintomas: "secrecion purulenta disuria flujo amarillento" },
  
  // SÍFILIS
  { enfermedad: "Sífilis", sintomas: "ulcera indurada chancro indolora duele genitales exantema sarpullido palmas manos plantas pies" },
  { enfermedad: "Sífilis", sintomas: "ulcera genitales duele sarpullido manos pies" },
  { enfermedad: "Sífilis", sintomas: "chancro indoloro exantema palmoplantar" },
  
  // FASCITIS PLANTAR
  { enfermedad: "Fascitis plantar", sintomas: "dolor intenso talon planta pie primeros pasos manana punzante caminar dificultad pisar apoyo talon" },
  { enfermedad: "Fascitis plantar", sintomas: "duele horrible talon primeros pasos manana punzante caminar pisar" },
  { enfermedad: "Fascitis plantar", sintomas: "dolor talon matinal punzante dificultad apoyo" },
  
  // ESGUINCE TOBILLO
  { enfermedad: "Esguince tobillo", sintomas: "dolor tobillo agudo hinchazon inflamacion edema moreton equimosis morado dificultad caminar apoyo pie torcedura trauma" },
  { enfermedad: "Esguince tobillo", sintomas: "duele tobillo hinchado morado dificultad caminar apoyar torci" },
  { enfermedad: "Esguince tobillo", sintomas: "dolor tobillo edema equimosis dificultad apoyo trauma" },
  
  // TENDINITIS
  { enfermedad: "Tendinitis", sintomas: "dolor tendon movimiento especifico inflamacion rigidez debilidad muneca codo hombro tobillo rodilla uso repetitivo" },
  { enfermedad: "Tendinitis", sintomas: "duele tendon muevo inflamado rigido debil muneca codo hombro movimiento repetido" },
  { enfermedad: "Tendinitis", sintomas: "dolor tendinoso movimiento inflamacion rigidez" },
];

// Agregar DESPUÉS del array de diagnosticos en tu index.js del backend

const explicacionesEnfermedades = {
  "Migraña": "La migraña es un tipo de dolor de cabeza intenso y pulsante que generalmente afecta un lado de la cabeza. Se acompaña de náuseas, vómitos y sensibilidad extrema a la luz (fotofobia) y sonidos (fonofobia). Los episodios pueden durar de 4 a 72 horas y pueden estar precedidos por síntomas visuales conocidos como 'aura'.",
  
  "Cefalea tensional": "La cefalea tensional es el tipo más común de dolor de cabeza. Se caracteriza por una sensación de presión o tensión bilateral (en ambos lados de la cabeza), como si llevara una banda apretada alrededor de la cabeza. Suele estar relacionada con el estrés, la tensión muscular en cuello y hombros, y mejora con el descanso.",
  
  "Sinusitis aguda": "La sinusitis aguda es la inflamación e infección de los senos paranasales, generalmente causada por virus o bacterias. Produce dolor y presión facial intensa en la frente, mejillas y alrededor de los ojos, congestión nasal con secreción espesa amarillenta o verdosa, y el dolor aumenta al inclinar la cabeza hacia adelante.",
  
  "Gripe": "La gripe (influenza) es una infección viral respiratoria altamente contagiosa. Los síntomas aparecen súbitamente e incluyen fiebre alta (38-40°C), escalofríos intensos, dolores musculares y articulares severos (mialgias), fatiga extrema, tos seca y dolor de garganta. Es más grave que un resfriado común y puede durar de 1 a 2 semanas.",
  
  "Resfriado común": "El resfriado común es una infección viral leve de las vías respiratorias superiores causada por rinovirus. Los síntomas se desarrollan gradualmente e incluyen congestión nasal, estornudos frecuentes, tos leve, dolor de garganta leve y generalmente no causa fiebre alta. Es autolimitado y dura típicamente de 7 a 10 días.",
  
  "COVID-19": "COVID-19 es una enfermedad respiratoria causada por el coronavirus SARS-CoV-2. Los síntomas característicos incluyen fiebre, tos seca persistente, pérdida total del olfato (anosmia) y gusto (ageusia), dificultad para respirar, fatiga y dolor de garganta. Puede variar desde casos leves hasta neumonía grave que requiere hospitalización.",
  
  "Gastroenteritis": "La gastroenteritis es la inflamación del tracto gastrointestinal causada por virus, bacterias o parásitos. Se caracteriza por diarrea líquida frecuente, náuseas, vómitos, dolor abdominal tipo cólico, fiebre leve y puede causar deshidratación si no se reponen adecuadamente los líquidos perdidos. Es altamente contagiosa.",
  
  "Faringitis": "La faringitis es la inflamación de la faringe (garganta) que causa dolor intenso al tragar (odinofagia). Puede ser viral o bacteriana (como la faringitis estreptocócica). Se caracteriza por garganta roja e inflamada, amígdalas aumentadas de tamaño, fiebre y ganglios linfáticos cervicales inflamados.",
  
  "Bronquitis": "La bronquitis es la inflamación de los bronquios (conductos que llevan aire a los pulmones). Se caracteriza por tos persistente y productiva con expectoración de flema amarilla o verdosa, dificultad para respirar, sibilancias (silbidos en el pecho) y dolor torácico al toser. Puede ser aguda (por infección) o crónica (por tabaquismo).",
  
  "Neumonía": "La neumonía es una infección pulmonar grave que inflama los alvéolos y los llena de líquido o pus. Causa fiebre muy alta (39°C o más), tos productiva con flema amarilla, verdosa o herrumbrosa, dolor torácico intenso al respirar (dolor pleurítico), dificultad respiratoria severa y escalofríos intensos. Requiere tratamiento médico urgente.",
  
  "Asma": "El asma es una enfermedad crónica que inflama y estrecha las vías respiratorias. Causa episodios recurrentes de dificultad para respirar, sibilancias (silbidos en el pecho), opresión torácica y tos seca, especialmente por la noche o al despertar. Los síntomas pueden desencadenarse por alérgenos, ejercicio o cambios climáticos.",
  
  "Infarto miocardio": "El infarto de miocardio (ataque cardíaco) ocurre cuando se bloquea el flujo sanguíneo al corazón. Causa dolor torácico intenso y opresivo (como un elefante sobre el pecho) que se irradia al brazo izquierdo, mandíbula, cuello o espalda, sudoración fría profusa, náuseas, dificultad para respirar y sensación de muerte inminente. ES UNA EMERGENCIA MÉDICA - LLAMAR AL 911 INMEDIATAMENTE.",
  
  "Angina pecho": "La angina de pecho es dolor o molestia torácica causada por flujo sanguíneo insuficiente al corazón. Se presenta como presión u opresión en el pecho durante esfuerzo físico o estrés emocional, puede irradiar al brazo izquierdo, y mejora con reposo o nitroglicerina. Es una señal de advertencia de enfermedad cardíaca.",
  
  "Ansiedad": "El trastorno de ansiedad causa preocupación excesiva y persistente difícil de controlar. Los síntomas físicos incluyen palpitaciones, sudoración profusa, temblores, sensación de falta de aire, opresión en el pecho, mareos, miedo intenso o pánico sin causa aparente. Puede interferir significativamente con las actividades diarias.",
  
  "Depresión": "La depresión es un trastorno del estado de ánimo caracterizado por tristeza profunda y persistente durante semanas o meses, pérdida de interés en actividades que antes disfrutaba (anhedonia), fatiga extrema, alteraciones del sueño (insomnio o hipersomnia), pérdida de apetito, sentimientos de inutilidad y en casos graves, pensamientos de muerte o suicidio.",
  
  "Diabetes tipo 2": "La diabetes tipo 2 es una enfermedad crónica donde el cuerpo no procesa correctamente la glucosa (azúcar en sangre). Causa sed excesiva, necesidad de orinar frecuentemente, visión borrosa, fatiga, heridas que tardan en cicatrizar e infecciones frecuentes. Si no se controla puede causar complicaciones graves en riñones, ojos, nervios y corazón.",
  
  "Hipertensión": "La hipertensión (presión arterial alta) generalmente no causa síntomas, por eso se le llama 'el asesino silencioso'. Cuando los hay, incluyen dolor de cabeza en la nuca, mareos, zumbido en los oídos, visión borrosa y palpitaciones. Aumenta el riesgo de infarto, derrame cerebral y daño renal.",
  
  "Hipotensión": "La hipotensión (presión arterial baja) causa mareos frecuentes, sensación de debilidad, fatiga, visión borrosa y en casos severos, desmayos (síncope). Ocurre cuando la presión arterial cae por debajo de 90/60 mmHg y el cerebro no recibe suficiente flujo sanguíneo.",
  
  "Artritis reumatoide": "La artritis reumatoide es una enfermedad autoinmune crónica que causa inflamación simétrica de las articulaciones (afecta ambos lados del cuerpo por igual). Se caracteriza por dolor articular, rigidez matinal prolongada (más de 1 hora), hinchazón, calor y enrojecimiento de las articulaciones, especialmente en manos, muñecas y rodillas. Con el tiempo puede causar deformidades.",
  
  "Artrosis": "La artrosis es el desgaste del cartílago articular relacionado con la edad. Causa dolor mecánico (empeora con el movimiento y mejora con el reposo) en rodillas, caderas, manos y columna, rigidez matinal breve (menos de 30 minutos) y crepitación (crujidos) al mover las articulaciones. Es la forma más común de artritis.",
  
  "Gota": "La gota es causada por acumulación de cristales de ácido úrico en las articulaciones. Se caracteriza por dolor articular súbito, extremadamente intenso e insoportable, generalmente en el dedo gordo del pie (podagra), que aparece típicamente por la noche. La articulación afectada está muy roja, hinchada, caliente y tan sensible que no se puede tocar ni apoyar.",
  
  "Cistitis": "La cistitis es una infección de la vejiga urinaria, más común en mujeres. Causa ardor intenso al orinar (disuria), necesidad urgente de orinar frecuentemente (urgencia y polaquiuria), dolor en el bajo vientre, orina turbia con mal olor y a veces sangre en la orina (hematuria).",
  
  "Pielonefritis": "La pielonefritis es una infección del riñón, más grave que la cistitis. Causa fiebre alta (38°C o más), escalofríos intensos, dolor en el costado o espalda baja (lumbar) de un solo lado, ardor al orinar, náuseas y vómitos. Requiere tratamiento antibiótico urgente para prevenir daño renal permanente.",
  
  "Pancreatitis aguda": "La pancreatitis aguda es la inflamación súbita del páncreas. Causa dolor abdominal superior muy intenso y penetrante que se irradia hacia la espalda en forma de cinturón, náuseas, vómitos abundantes, fiebre y distensión abdominal. El dolor empeora al acostarse y mejora al sentarse inclinado hacia adelante. Es una emergencia médica.",
  
  "Apendicitis": "La apendicitis es la inflamación del apéndice. Típicamente comienza con dolor periumbilical (alrededor del ombligo) que luego migra a la fosa ilíaca derecha (parte baja derecha del abdomen). Se acompaña de náuseas, vómitos, fiebre, pérdida de apetito y el dolor aumenta con el movimiento o la tos. Requiere cirugía urgente.",
  
  "Dermatitis atópica": "La dermatitis atópica (eccema) es una enfermedad inflamatoria crónica de la piel. Causa picazón intensa e insoportable, enrojecimiento, erupciones, resequedad severa y descamación de la piel. Es más común en personas con antecedentes de alergias o asma y tiende a aparecer en brotes.",
  
  "Psoriasis": "La psoriasis es una enfermedad autoinmune crónica de la piel. Se caracteriza por placas rojas bien definidas cubiertas de escamas blancas o plateadas gruesas. Aparece comúnmente en codos, rodillas, cuero cabelludo y espalda baja. No es contagiosa y puede mejorar y empeorar en brotes.",
  
  "Acné": "El acné es una enfermedad de la piel causada por obstrucción de los poros. Se caracteriza por espinillas, puntos negros (comedones), granos rojos (pápulas), lesiones con pus (pústulas) y enrojecimiento, principalmente en cara, pecho y espalda. Es más común en adolescentes debido a cambios hormonales.",
  
  "Alergia estacional": "La alergia estacional (rinitis alérgica o fiebre del heno) es causada por alérgenos como polen. Causa estornudos frecuentes, congestión nasal, moqueo acuoso, picazón en ojos, nariz y garganta, y lagrimeo. Los síntomas empeoran en primavera y otoño cuando hay más polen en el aire.",
  
  "Urticaria": "La urticaria es una reacción alérgica de la piel. Se caracteriza por ronchas o habones rojos elevados que causan picazón intensa. Las lesiones pueden aparecer y desaparecer rápidamente, cambiar de forma y ubicación. Puede ser causada por alimentos, medicamentos, picaduras de insectos o estrés.",
  
  "Conjuntivitis": "La conjuntivitis es la inflamación de la conjuntiva (membrana que cubre el ojo). Causa enrojecimiento ocular (ojo rojo), picazón, lagrimeo, secreción (legañas) que puede ser acuosa (viral) o purulenta (bacteriana), y párpados pegados especialmente al despertar. Es muy contagiosa cuando es viral o bacteriana.",
  
  "Miopía": "La miopía es un defecto refractivo del ojo donde los objetos lejanos se ven borrosos mientras que los cercanos se ven claramente. Las personas miopes tienden a entrecerrar los ojos para intentar enfocar objetos distantes. Se corrige con lentes (anteojos o lentes de contacto) o cirugía refractiva.",
  
  "Otitis media": "La otitis media es una infección del oído medio, más común en niños. Causa dolor de oído intenso (otalgia), sensación de presión en el oído, fiebre, dificultad para escuchar (hipoacusia temporal) y a veces secreción purulenta si se perfora el tímpano. Requiere tratamiento antibiótico.",
  
  "Vértigo posicional": "El vértigo posicional paroxístico benigno (VPPB) es causado por cristales de calcio desplazados en el oído interno. Causa episodios breves e intensos de vértigo (sensación de que todo gira) desencadenados por cambios de posición de la cabeza, como al acostarse, levantarse o girar en la cama.",
  
  "Insomnio": "El insomnio es la dificultad persistente para conciliar el sueño, mantenerlo o lograr un sueño reparador. Causa despertares frecuentes durante la noche, despertar muy temprano sin poder volver a dormir, cansancio diurno, fatiga, irritabilidad, dificultad para concentrarse y afecta el rendimiento laboral o académico.",
  
  "Herpes zóster": "El herpes zóster (culebrilla) es causado por la reactivación del virus de la varicela. Se caracteriza por vesículas (ampollas) dolorosas que aparecen en forma de banda o cinturón en un solo lado del cuerpo (unilateral), siguiendo un dermatoma. Causa dolor neuropático intenso tipo ardor o quemadura que puede aparecer días antes de las lesiones.",
  
  "Varicela": "La varicela es una infección viral altamente contagiosa causada por el virus varicela-zóster. Se caracteriza por erupción generalizada con vesículas (ampollas) que pican intensamente, fiebre y malestar general. Las lesiones aparecen en diferentes etapas: manchas rojas, ampollas y costras. Es más común en niños.",
  
  "Hepatitis A": "La hepatitis A es una infección viral del hígado transmitida por vía fecal-oral. Causa ictericia (coloración amarilla de piel y ojos), fatiga intensa, dolor en el cuadrante superior derecho del abdomen, náuseas, vómitos, orina oscura (coluria) y heces claras (acolia). Generalmente se recupera completamente en semanas o meses.",
  
  "Cirrosis hepática": "La cirrosis hepática es la cicatrización y daño irreversible del hígado, causada por alcoholismo crónico, hepatitis viral o enfermedad del hígado graso. Causa acumulación de líquido en el abdomen (ascitis), ictericia, confusión mental (encefalopatía), hinchazón de piernas, fatiga y sangrado fácil. Es una condición grave y potencialmente mortal.",
  
  "Reflujo gastroesofágico": "El reflujo gastroesofágico (ERGE) ocurre cuando el ácido del estómago sube al esófago. Causa ardor en el pecho detrás del esternón (pirosis), sabor ácido o amargo en la boca, regurgitación ácida y dolor epigástrico. Los síntomas empeoran al acostarse, después de comer o al agacharse.",
  
  "Úlcera péptica": "La úlcera péptica es una llaga en el revestimiento del estómago o duodeno, generalmente causada por Helicobacter pylori o AINEs. Causa dolor epigástrico tipo ardor, hambre dolorosa que mejora al comer pero empeora 2-3 horas después, náuseas y en casos graves, heces negras (melena) por sangrado.",
  
  "Enfermedad celíaca": "La enfermedad celíaca es una enfermedad autoinmune causada por intolerancia al gluten (proteína del trigo, cebada y centeno). Causa diarrea crónica, pérdida de peso, dolor abdominal, hinchazón, fatiga y malabsorción de nutrientes. El único tratamiento es seguir una dieta estricta sin gluten de por vida.",
  
  "Síndrome intestino irritable": "El síndrome de intestino irritable (SII) es un trastorno funcional del intestino. Causa dolor abdominal recurrente, alternancia entre diarrea y estreñimiento, distensión abdominal, gases excesivos y los síntomas mejoran después de defecar. Es una condición crónica que afecta la calidad de vida pero no causa daño intestinal permanente.",
  
  "Cálculos renales": "Los cálculos renales son piedras que se forman en los riñones. Causan cólico renal, un dolor extremadamente intenso e insoportable en el costado o espalda baja que viene en ondas, náuseas, vómitos y sangre en la orina (hematuria). El dolor es tan severo que a menudo se describe como uno de los peores dolores imaginables.",
  
  "Insuficiencia renal crónica": "La insuficiencia renal crónica es la pérdida gradual e irreversible de la función renal. Causa fatiga extrema, hinchazón de tobillos y pies (edema), palidez por anemia, orina espumosa (por proteínas), náuseas, pérdida de apetito, picazón generalizada y en etapas avanzadas puede requerir diálisis o trasplante.",
  
  "Osteoporosis": "La osteoporosis es la disminución de la densidad ósea que hace los huesos frágiles y propensos a fracturas. Generalmente no causa síntomas hasta que ocurre una fractura (típicamente en cadera, columna o muñeca), pérdida de altura progresiva, postura encorvada y dolor de espalda crónico. Es más común en mujeres postmenopáusicas.",
  
  "Fibromialgia": "La fibromialgia es un trastorno crónico caracterizado por dolor musculoesquelético generalizado en todo el cuerpo, múltiples puntos sensibles dolorosos a la palpación, fatiga crónica persistente, rigidez matinal, sueño no reparador, problemas de concentración ('fibro niebla') y sensibilidad aumentada al dolor.",
  
  "Lupus": "El lupus eritematoso sistémico es una enfermedad autoinmune crónica que puede afectar múltiples órganos. Se caracteriza por erupción facial en forma de mariposa en mejillas y nariz (eritema malar), dolor articular, fiebre, fatiga extrema, fotosensibilidad (sensibilidad al sol) y puede causar daño a riñones, corazón y pulmones.",
  
  "Epilepsia": "La epilepsia es un trastorno neurológico caracterizado por crisis convulsivas recurrentes causadas por actividad eléctrica anormal en el cerebro. Las convulsiones pueden causar pérdida de consciencia, caídas, movimientos involuntarios rítmicos, contracciones musculares, confusión temporal y en algunos casos incontinencia. Requiere tratamiento con anticonvulsivos.",
  
  "Parkinson": "La enfermedad de Parkinson es un trastorno neurodegenerativo progresivo. Se caracteriza por temblor en reposo (especialmente en manos), rigidez muscular, lentitud de movimientos (bradicinesia), dificultad para caminar arrastrando los pies, postura encorvada, pérdida de expresión facial y alteraciones del equilibrio. Los síntomas empeoran gradualmente con el tiempo.",
  
  "Alzheimer": "La enfermedad de Alzheimer es la forma más común de demencia, caracterizada por deterioro cognitivo progresivo. Causa pérdida de memoria reciente, olvidos frecuentes, confusión sobre tiempo y lugar, desorientación, dificultad para reconocer personas familiares, cambios de personalidad y pérdida progresiva de la capacidad para realizar actividades diarias.",
  
  "Accidente cerebrovascular": "El accidente cerebrovascular (ACV o derrame cerebral) ocurre cuando se interrumpe el flujo sanguíneo al cerebro. Causa debilidad súbita de cara, brazo o pierna en un solo lado del cuerpo, asimetría facial, dificultad para hablar (lenguaje arrastrado), confusión, mareos severos, pérdida de equilibrio y dolor de cabeza intenso. ES UNA EMERGENCIA MÉDICA - LLAMAR AL 911 INMEDIATAMENTE.",
  
  "Tuberculosis pulmonar": "La tuberculosis pulmonar es una infección bacteriana contagiosa causada por Mycobacterium tuberculosis. Causa tos persistente por más de 3 semanas, expectoración con sangre (hemoptisis), pérdida de peso progresiva, sudores nocturnos profusos que empapan las sábanas, fiebre vespertina y fatiga extrema. Requiere tratamiento antibiótico prolongado (6 meses).",
  
  "Malaria": "La malaria (paludismo) es una enfermedad parasitaria transmitida por mosquitos Anopheles. Se caracteriza por fiebre intermitente cíclica (cada 48-72 horas según el tipo de parásito), escalofríos intensos con temblores incontrolables, sudoración profusa, dolor de cabeza, náuseas y vómitos. Es potencialmente mortal si no se trata.",
  
  "Dengue": "El dengue es una enfermedad viral transmitida por mosquitos Aedes. Causa fiebre muy alta de inicio súbito (40°C), dolor muscular y articular tan intenso que se llama 'fiebre quebrantahuesos', dolor detrás de los ojos (retrorbitario), erupción cutánea, sangrado leve de encías o nariz. En casos graves puede causar dengue hemorrágico potencialmente mortal.",
  
  "VIH/SIDA": "El VIH (Virus de Inmunodeficiencia Humana) destruye progresivamente el sistema inmunológico. Causa ganglios inflamados persistentes, fiebre prolongada por más de un mes, sudores nocturnos, pérdida de peso involuntaria, fatiga extrema e infecciones oportunistas frecuentes. Sin tratamiento progresa a SIDA donde el sistema inmune está severamente debilitado.",
  
  "Mononucleosis": "La mononucleosis infecciosa ('enfermedad del beso') es causada por el virus de Epstein-Barr. Causa fiebre persistente prolongada, faringitis con dolor de garganta muy intenso, inflamación masiva de ganglios del cuello (linfadenopatia cervical), fatiga extrema que puede durar semanas o meses, y aumento del tamaño del bazo (esplenomegalia).",
  
  "Gonorrea": "La gonorrea es una infección de transmisión sexual causada por bacteria Neisseria gonorrhoeae. En hombres causa secreción purulenta amarilla o verdosa del pene, ardor intenso al orinar y dolor testicular. En mujeres causa flujo vaginal anormal, sangrado entre períodos y dolor al orinar. Si no se trata puede causar infertilidad.",
  
  "Sífilis": "La sífilis es una infección de transmisión sexual bacteriana que evoluciona en etapas. La etapa primaria causa una úlcera indolora (chancro) en genitales. La etapa secundaria causa erupción cutánea en palmas de manos y plantas de pies, fiebre y ganglios inflamados. Sin tratamiento puede causar daño grave a corazón, cerebro y otros órganos.",
  
  "Fascitis plantar": "La fascitis plantar es la inflamación de la fascia plantar (tejido grueso en la planta del pie). Causa dolor intenso y punzante en el talón especialmente con los primeros pasos al despertar en la mañana, que mejora después de caminar un poco pero empeora al final del día. Es más común en corredores y personas con sobrepeso.",
  
  "Esguince tobillo": "El esguince de tobillo es el estiramiento o desgarro de los ligamentos del tobillo por torcedura. Causa dolor agudo inmediato, hinchazón rápida, moretón (equimosis), dificultad para caminar o apoyar el pie. Según la gravedad puede ser leve (grado 1), moderado (grado 2) o severo con ruptura completa del ligamento (grado 3).",
  
  "Tendinitis": "La tendinitis es la inflamación de un tendón causada por uso repetitivo o sobrecarga. Causa dolor localizado en el tendón afectado que empeora con movimientos específicos, inflamación, rigidez y debilidad en la articulación. Es común en muñeca, codo (codo de tenista), hombro (manguito rotador), tobillo (tendón de Aquiles) y rodilla."
};

// ========================================
// ENTRENAR MODELO IA
// ========================================
const { LogisticRegressionClassifier } = natural;
const classifier = new LogisticRegressionClassifier();
diagnosticos.forEach(({ enfermedad, sintomas }) => {
  const textoNormalizado = normalizarTexto(sintomas);
  classifier.addDocument(textoNormalizado, enfermedad);
});
classifier.train();
console.log('✅ Logistic Regression entrenado');
console.log(`🎯 Sistema listo: ${diagnosticos.length} patrones de enfermedades\n`);

// ========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ========================================
const verificarToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.user = decoded; // { id, email }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// ========================================
// FUNCIÓN AUXILIAR - CALCULAR GRAVEDAD
// ========================================
// ========================================
// CLASIFICACIÓN DE GRAVEDAD POR ENFERMEDAD
// ========================================
const gravedadEnfermedades = {
  // GRAVEDAD BAJA (10 enfermedades)
  "Resfriado común": "baja",
  "Alergia estacional": "baja",
  "Conjuntivitis": "baja",
  "Dermatitis atópica": "baja",
  "Acné": "baja",
  "Insomnio": "baja",
  "Fascitis plantar": "baja",
  "Tendinitis": "baja",
  "Esguince tobillo": "baja",
  "Urticaria": "baja",
  "Miopía": "baja",
  
  // GRAVEDAD MODERADA (22 enfermedades)
  "Migraña": "moderada",
  "Cefalea tensional": "moderada",
  "Gripe": "moderada",
  "Sinusitis aguda": "moderada",
  "Gastroenteritis": "moderada",
  "Faringitis": "moderada",
  "Bronquitis": "moderada",
  "Cistitis": "moderada",
  "Reflujo gastroesofágico": "moderada",
  "Artrosis": "moderada",
  "Psoriasis": "moderada",
  "Otitis media": "moderada",
  "Vértigo posicional": "moderada",
  "Mononucleosis": "moderada",
  "Varicela": "moderada",
  "Herpes zóster": "moderada",
  "Artritis reumatoide": "moderada",
  "Fibromialgia": "moderada",
  "Ansiedad": "moderada",
  "Depresión": "moderada",
  "Úlcera péptica": "moderada",
  "Síndrome intestino irritable": "moderada",
  
  // GRAVEDAD ALTA (31 enfermedades)
  "COVID-19": "alta",
  "Neumonía": "alta",
  "Asma": "alta",
  "Infarto miocardio": "alta",
  "Angina pecho": "alta",
  "Accidente cerebrovascular": "alta",
  "Diabetes tipo 2": "alta",
  "Hipertensión": "alta",
  "Hipotensión": "alta",
  "Pielonefritis": "alta",
  "Pancreatitis aguda": "alta",
  "Apendicitis": "alta",
  "Gota": "alta",
  "Enfermedad celíaca": "alta",
  "Cálculos renales": "alta",
  "Insuficiencia renal crónica": "alta",
  "Hepatitis A": "alta",
  "Cirrosis hepática": "alta",
  "Tuberculosis pulmonar": "alta",
  "Malaria": "alta",
  "Dengue": "alta",
  "VIH/SIDA": "alta",
  "Gonorrea": "alta",
  "Sífilis": "alta",
  "Osteoporosis": "alta",
  "Lupus": "alta",
  "Epilepsia": "alta",
  "Parkinson": "alta",
  "Alzheimer": "alta"
};

// NUEVA FUNCIÓN calcularGravedad
const calcularGravedad = (enfermedad) => {
  return gravedadEnfermedades[enfermedad] || "moderada";
};


// ========================================
// RUTAS DE AUTENTICACIÓN
// ========================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    const existente = await prisma.usuarios.findUnique({
      where: { email }
    });

    if (existente) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    const token = jwt.sign(
      { id: nuevoUsuario.usuario_id, email: nuevoUsuario.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: nuevoUsuario.usuario_id,
        name: nuevoUsuario.name,
        email: nuevoUsuario.email
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { email },
      include: { personas: true }
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

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
        email: usuario.email,
        nombres: usuario.personas?.nombres || 'Usuario',
        apellido_paterno: usuario.personas?.apellido_paterno || ''
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// ========================================
// RUTA DE DIAGNÓSTICO CON IA
// ========================================

// POST /api/diagnostico - Obtener diagnóstico de IA
app.post('/api/diagnostico', (req, res) => {
  const { sintomas } = req.body;

  if (!sintomas || !Array.isArray(sintomas) || sintomas.length === 0) {
    return res.status(400).json({
      error: "Envía array de síntomas"
    });
  }

  const textoOriginal = sintomas.join(" ");
  const textoNormalizado = normalizarTexto(textoOriginal);

  console.log('\n📝 ========== NUEVO DIAGNÓSTICO ==========');
  console.log('Entrada:', textoOriginal);
  
  const predicciones = classifier.getClassifications(textoNormalizado);
  const top3 = predicciones.slice(0, 3).map((p, index) => ({
    posicion: index + 1,
    enfermedad: p.label,
    confianza: Math.round(p.value * 100)
  }));

  console.log('\n🏆 TOP 3 DIAGNÓSTICOS:');
  top3.forEach(d => {
    console.log(`  ${d.posicion}. ${d.enfermedad}: ${d.confianza}%`);
  });

  const diagnosticoPrincipal = top3[0];

  const CONFIANZA_MINIMA = 25;
  if (diagnosticoPrincipal.confianza < CONFIANZA_MINIMA) {
    console.log(`\n❌ Confianza muy baja (${diagnosticoPrincipal.confianza}% < ${CONFIANZA_MINIMA}%)`);
    return res.json({
      diagnostico: null,
      confianza: diagnosticoPrincipal.confianza,
      mensaje: "⚠️ No tengo suficiente información para darte un diagnóstico confiable",
      explicacion: "Los síntomas que mencionaste son muy generales o no coinciden claramente con ninguna enfermedad específica en mi base de conocimientos. Por favor, proporciona más detalles sobre tus síntomas.",
      sugerencias: [
        "Describe la intensidad de los síntomas (leve, moderado, severo)",
        "¿Desde cuándo tienes estos síntomas?",
        "¿Hay otros síntomas que no mencionaste?",
        "¿El malestar es constante o intermitente?"
      ],
      necesita_mas_info: true,
      top3: top3
    });
  }

  // ✅ DESPUÉS:
  const explicacion = explicacionesEnfermedades[diagnosticoPrincipal.enfermedad] || 
  `${diagnosticoPrincipal.enfermedad} es una condición médica que presenta los síntomas que has descrito. Los síntomas que mencionaste coinciden con el patrón típico de esta enfermedad. Sin embargo, este es solo un diagnóstico preliminar basado en inteligencia artificial. Te recomendamos consultar con un médico profesional para un diagnóstico definitivo y tratamiento adecuado.`;


  const sintomasClave = textoNormalizado
    .split(' ')
    .filter(p => p.length > 3)
    .slice(0, 4)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(', ');

  const mensajeAsistente = `Basándome en los síntomas que mencionaste (${sintomasClave.toLowerCase()}), creo que podrías tener **${diagnosticoPrincipal.enfermedad}** con una confianza del ${diagnosticoPrincipal.confianza}%.\n\n${explicacion}\n\n**¿Por qué creo que es esto?**\nLos síntomas que describiste coinciden con el patrón típico de ${diagnosticoPrincipal.enfermedad}. Sin embargo, este es solo un diagnóstico preliminar basado en inteligencia artificial. Te recomiendo consultar con un médico profesional para un diagnóstico definitivo y tratamiento adecuado.`;

  console.log(`\n✅ Diagnóstico: ${diagnosticoPrincipal.enfermedad} (${diagnosticoPrincipal.confianza}%)`);
  console.log('==========================================\n');

  res.json({
    diagnostico: diagnosticoPrincipal.enfermedad,
    confianza: diagnosticoPrincipal.confianza,
    mensaje: mensajeAsistente,
    explicacion: explicacion,
    top3: top3,
    sintomas_mencionados: sintomasClave,
    recomendacion: "⚠️ Recuerda: Este es un diagnóstico asistido por IA. Consulta con un médico profesional para confirmación y tratamiento."
  });
});

// ========================================
// RUTAS DE HISTORIAL (NUEVAS) 🆕
// ========================================

// POST /api/diagnosticos - Guardar diagnóstico en base de datos
app.post('/api/diagnosticos', verificarToken, async (req, res) => {
  try {
    const { diagnostico, confianza, sintomas, top3 } = req.body;
    const usuarioId = req.user.id;

    if (!diagnostico || confianza === undefined || !sintomas) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos'
      });
    }

    const gravedad = calcularGravedad(diagnostico, confianza);
    const sintomasTexto = Array.isArray(sintomas) ? sintomas.join(', ') : sintomas;

    // Crear consulta con diagnósticos probables
    const nuevaConsulta = await prisma.$transaction(async (tx) => {
      const consulta = await tx.consultas.create({
        data: {
          usuario_id: usuarioId,
          sintomas_inicial: sintomasTexto,
          diagnostico_final: diagnostico,
          gravedad: gravedad,
          estado: 'cerrada'
        }
      });

      // Diagnóstico principal
      await tx.diagnosticos_probables.create({
        data: {
          consulta_id: consulta.id,
          enfermedad: diagnostico,
          probabilidad: parseFloat(confianza),
          descripcion: `Diagnóstico principal con ${confianza}% de confianza`,
          recomendaciones: 'Consultar con un médico profesional para confirmación'
        }
      });

      // Diagnósticos alternativos (top3)
      if (top3 && Array.isArray(top3)) {
        for (const diag of top3.slice(1)) {
          await tx.diagnosticos_probables.create({
            data: {
              consulta_id: consulta.id,
              enfermedad: diag.enfermedad,
              probabilidad: parseFloat(diag.confianza),
              descripcion: `Diagnóstico alternativo #${diag.posicion}`,
              recomendaciones: 'Diagnóstico diferencial a considerar'
            }
          });
        }
      }

      return await tx.consultas.findUnique({
        where: { id: consulta.id },
        include: {
          diagnosticos_probables: { orderBy: { probabilidad: 'desc' } },
          usuarios: { include: { personas: true } }
        }
      });
    });

    console.log(`✅ Diagnóstico guardado: ${diagnostico} (${confianza}%) - Usuario: ${usuarioId}`);

    res.status(201).json({
      success: true,
      message: 'Diagnóstico guardado exitosamente',
      data: nuevaConsulta
    });

  } catch (error) {
    console.error('❌ Error al guardar diagnóstico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar diagnóstico',
      error: error.message
    });
  }
});

// GET /api/diagnosticos - Obtener historial del usuario
app.get('/api/diagnosticos', verificarToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const consultas = await prisma.consultas.findMany({
      where: { usuario_id: usuarioId },
      orderBy: { created_at: 'desc' },
      include: {
        diagnosticos_probables: { orderBy: { probabilidad: 'desc' } },
        usuarios: { include: { personas: true } }
      }
    });

    const historialFormateado = consultas.map(consulta => {
      const diagnosticoPrincipal = consulta.diagnosticos_probables[0];
      
      return {
        id: consulta.id,
        diagnostico: consulta.diagnostico_final || diagnosticoPrincipal?.enfermedad || 'Sin diagnóstico',
        confianza: diagnosticoPrincipal?.probabilidad ? Number(diagnosticoPrincipal.probabilidad) : 0,
        sintomas: consulta.sintomas_inicial.split(', '),
        gravedad: consulta.gravedad,
        nombrePaciente: `${consulta.usuarios.personas.nombres} ${consulta.usuarios.personas.apellido_paterno}`,
        fecha: consulta.created_at,
        estado: consulta.estado
      };
    });

    res.json({
      success: true,
      data: historialFormateado
    });

  } catch (error) {
    console.error('❌ Error al obtener historial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  }
});

// GET /api/diagnosticos/estadisticas - Obtener estadísticas
app.get('/api/diagnosticos/estadisticas', verificarToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;

    const [total, baja, moderada, alta] = await Promise.all([
      prisma.consultas.count({ where: { usuario_id: usuarioId } }),
      prisma.consultas.count({ where: { usuario_id: usuarioId, gravedad: 'baja' } }),
      prisma.consultas.count({ where: { usuario_id: usuarioId, gravedad: 'moderada' } }),
      prisma.consultas.count({ where: { usuario_id: usuarioId, gravedad: 'alta' } })
    ]);

    res.json({
      success: true,
      data: { total, baja, moderada, alta }
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// GET /api/diagnosticos/:id - Obtener consulta específica
app.get('/api/diagnosticos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const consulta = await prisma.consultas.findFirst({
      where: { id: parseInt(id), usuario_id: usuarioId },
      include: {
        diagnosticos_probables: { orderBy: { probabilidad: 'desc' } },
        historial_conversaciones: { orderBy: { created_at: 'asc' } },
        usuarios: { include: { personas: true } }
      }
    });

    if (!consulta) {
      return res.status(404).json({
        success: false,
        message: 'Consulta no encontrada'
      });
    }

    res.json({
      success: true,
      data: consulta
    });

  } catch (error) {
    console.error('❌ Error al obtener consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener consulta',
      error: error.message
    });
  }
});

// DELETE /api/diagnosticos/:id - Eliminar consulta
app.delete('/api/diagnosticos/:id', verificarToken, async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    const consulta = await prisma.consultas.findFirst({
      where: { id: parseInt(id), usuario_id: usuarioId }
    });

    if (!consulta) {
      return res.status(404).json({
        success: false,
        message: 'Consulta no encontrada'
      });
    }

    await prisma.consultas.delete({
      where: { id: parseInt(id) }
    });

    console.log(`🗑️ Consulta eliminada: ID ${id} - Usuario: ${usuarioId}`);

    res.json({
      success: true,
      message: 'Consulta eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar consulta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar consulta',
      error: error.message
    });
  }
});

// ========================================
// INICIAR SERVIDOR
// ========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`   AsistMedic - Sistema de Diagnóstico IA`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/diagnostico           (IA - Obtener diagnóstico)`);
  console.log(`   POST /api/diagnosticos          (Guardar en BD) 🆕`);
  console.log(`   GET  /api/diagnosticos          (Historial) 🆕`);
  console.log(`   GET  /api/diagnosticos/:id      (Detalle) 🆕`);
  console.log(`   GET  /api/diagnosticos/estadisticas 🆕`);
  console.log(`   DELETE /api/diagnosticos/:id 🆕`);
  console.log(`========================================`);
  console.log(`🤖 Algoritmo: Logistic Regression`);
  console.log(`📊 Enfermedades: ${diagnosticos.length} patrones`);
  console.log(`========================================\n`);
});
