import express from 'express';
import cors from 'cors';
import natural from 'natural';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from './prisma.js'; // ✅ Cambiado

const app = express();
app.use(cors());
app.use(express.json());

// SECRET PARA JWT
const JWT_SECRET = process.env.JWT_SECRET || 'mi-secreto-super-seguro-2024';

// ✅ YA NO NECESITAS ESTO:
// const { Pool } = pg;
// const pool = new Pool({ ... });

// ====================== NORMALIZACIÓN DE TEXTO ======================
const normalizarTexto = (texto) => {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// ====================== DATASET COMPLETO ======================
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

// ====================== ENTRENAR ALGORITMO ======================
const { LogisticRegressionClassifier } = natural;

const classifier = new LogisticRegressionClassifier();

diagnosticos.forEach(({ enfermedad, sintomas }) => {
  const textoNormalizado = normalizarTexto(sintomas);
  classifier.addDocument(textoNormalizado, enfermedad);
});

classifier.train();
console.log('✅ Logistic Regression entrenado');
console.log(`🎯 Sistema listo: ${diagnosticos.length} patrones de enfermedades\n`);

// ====================== AUTENTICACIÓN ======================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // ✅ ANTES: pool.query('SELECT * FROM usuarios...')
    // ✅ AHORA: Prisma
    const existente = await prisma.usuarios.findUnique({
      where: { email }
    });

    if (existente) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ ANTES: pool.query('INSERT INTO usuarios...')
    // ✅ AHORA: Prisma
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    // ✅ ANTES: pool.query('SELECT * FROM usuarios...')
    // ✅ AHORA: Prisma
    const usuario = await prisma.usuarios.findUnique({
      where: { email }
    });

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const esValida = await bcrypt.compare(password, usuario.password);
    if (!esValida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.usuario_id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: usuario.usuario_id,
        name: usuario.name,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// ====================== DIAGNÓSTICO CON TOP 3 Y EXPLICACIÓN ======================

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

  // Obtener todas las clasificaciones
  const predicciones = classifier.getClassifications(textoNormalizado);

  // Top 3 enfermedades
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

  // Validación de confianza mínima
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

  // Buscar explicación de la enfermedad
  const enfermedad = diagnosticos.find(d => d.enfermedad === diagnosticoPrincipal.enfermedad);
  const explicacion = enfermedad ? enfermedad.explicacion : "No hay explicación disponible para esta condición.";

  // Extraer síntomas clave mencionados
  const sintomasClave = textoNormalizado
    .split(' ')
    .filter(p => p.length > 3)
    .slice(0, 4)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(', ');

  // Generar mensaje personalizado
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

// ====================== SERVIDOR ======================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 ========================================`);
  console.log(`   AsistMedic - Sistema de Diagnóstico IA`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`========================================`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/diagnostico`);
  console.log(`========================================`);
  console.log(`🤖 Algoritmo: Logistic Regression`);
  console.log(`📊 Características:`);
  console.log(`   • Top 3 diagnósticos posibles`);
  console.log(`   • Explicación detallada`);
  console.log(`   • Confianza por porcentaje`);
  console.log(`========================================\n`);
});
