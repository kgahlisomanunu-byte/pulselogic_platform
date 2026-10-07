// backend/src/routes/reminders.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const nodemailer = require('nodemailer');

// â”€â”€â”€ TWILIO CLIENT â”€â”€â”€
let twilioClient = null;
let twilioConfigured = false;

try {
    if (process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.TWILIO_PHONE_NUMBER) {
        const twilio = require('twilio');
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
        twilioConfigured = true;
        console.log('âœ… Twilio initialized for phone calls');
    } else {
        console.warn('âš ï¸  Twilio not configured â€” phone calls are disabled until Twilio is configured');
    }
} catch (error) {
    console.warn('âš ï¸  Twilio module not installed â€” run: npm install twilio');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONSTANTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const CLINIC_NAME = process.env.CLINIC_NAME || 'PulseLogic Health';
const CALLBACK_NUMBER = process.env.CLINIC_CALLBACK_NUMBER || '0800 123 456';
const ELDERLY_AGE_THRESHOLD = 60;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LANGUAGE NORMALIZER
// Converts "English" -> "en", "isiZulu" -> "zu", etc.
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function normalizeLanguage(lang) {
    const l = (lang || 'en').toString().toLowerCase().trim();
    
    // Already a code?
    if (['en', 'zu', 'af', 'st', 'ts', 'tn', 'xh', 've', 'nso'].includes(l)) {
        return l;
    }
    
    // Map full names to codes
    const map = {
        'english': 'en',
        'isizulu': 'zu', 'zulu': 'zu',
        'afrikaans': 'af',
        'sesotho': 'st', 'sotho': 'st', 'south sotho': 'st',
        'xitsonga': 'ts', 'tsonga': 'ts',
        'setswana': 'tn', 'tswana': 'tn',
        'isixhosa': 'xh', 'xhosa': 'xh',
        'tshivenda': 've', 'venda': 've',
        'sepedi': 'nso', 'northern sotho': 'nso', 'pedi': 'nso'
    };
    
    return map[l] || 'en';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VOICE SCRIPT GENERATOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function generateVoiceScript(patient) {
    const lang = normalizeLanguage(patient.language);
    const age = parseInt(patient.age) || 0;
    const isElderly = age >= ELDERLY_AGE_THRESHOLD;

    const apptDate = patient.appointment_date 
        ? new Date(patient.appointment_date).toLocaleDateString('en-ZA', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
        : 'your next visit';
    
    const apptTime = patient.appointment_time || 'your scheduled time';
    const firstName = patient.first_name || 'friend';

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ELDERLY SCRIPTS (60+)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (isElderly) {
        const elderlyScripts = {
            'en': `Good day, Mama or Baba. This is a friendly reminder call from ${CLINIC_NAME}. Hello ${firstName}. This is to remind you of your appointment on ${apptDate} at ${apptTime}. Please do not forget to bring your clinic card and all your medicine bottles. Remember to take your medication every day, even when you feel well. If you have finished your medication, come and collect more at the clinic. Please do not share your medication with anyone. Take your pills at the same time every day, morning, afternoon, and evening. Do not forget to check your blood pressure every day. Eat less salt and less sugar. Walk for fifteen minutes every day. Drink at least six glasses of water every day. Do not smoke, and do not drink alcohol. If you cannot come, please call us at ${CALLBACK_NUMBER}. That number again: ${CALLBACK_NUMBER}. Please write it down. Thank you, Mama or Baba. Stay well. Goodbye.`,

            'zu': `Sawubona Mama noma Baba. Lolu wucingo lwesikhumbuzo oluvela e-${CLINIC_NAME}. Sawubona ${firstName}. Lokhu kukukhumbuza ngesikhathi sakho sokuhlangana ngo-${apptDate} ngo-${apptTime}. Sicela ungakhohlwa ukuphatha ikhadi lakho lasemtholampilo kanye nawo wonke amabhodlela emithi yakho. Khumbula ukuphuza imithi yakho nsuku zonke, noma ngabe uzwa sengcono. Uma usuqedile imithi yakho, woza uzolanda eminye emtholampilo. Sicela ungabeli imithi yakho nanoma ubani. Phuza amaphilisi akho ngesikhathi esifanayo nsuku zonke, ekuseni, ntambama, nakusihlwa. Ungakhohlwa ukuhlola umfutho wegazi lakho nsuku zonke. Yidla usawoti omncane noshukela omncane. Hamba imizuzu eyishumi nanhlanu nsuku zonke. Phuza okungenani izinkomishi eziyisithupha zamanzi nsuku zonke. Ungabhemi, futhi ungaphi utshwala. Uma ungakwazi ukuza, sicela usishayele ucingo ku-${CALLBACK_NUMBER}. Leyo nombolo futhi: ${CALLBACK_NUMBER}. Sicela uyibhale phansi. Ngiyabonga, Mama noma Baba. Sala kahle.`,

            'af': `Goeie dag, Mama of Baba. Hierdie is 'n vriendelike herinnering oproep van ${CLINIC_NAME}. Hallo ${firstName}. Dit is om jou te herinner aan jou afspraak op ${apptDate} om ${apptTime}. Moet asseblief nie vergeet om jou kliniekkaart en al jou medisynebottels saam te bring nie. Onthou om jou medikasie elke dag te neem, selfs wanneer jy beter voel. As jy jou medikasie klaar gebruik het, kom haal meer by die kliniek. Moet asseblief nie jou medikasie met enigiemand deel nie. Neem jou pille elke dag op dieselfde tyd, soggens, smiddags en saans. Moenie vergeet om jou bloeddruk elke dag te meet nie. Eet minder sout en minder suiker. Stap vyftien minute elke dag. Drink ten minste ses glase water elke dag. Moenie rook nie, en moenie alkohol drink nie. As jy nie kan kom nie, skakel ons by ${CALLBACK_NUMBER}. Daardie nommer weer: ${CALLBACK_NUMBER}. Skryf dit asseblief neer. Dankie, Mama of Baba. Bly gesond. Totsiens.`,

            'st': `Dumela Mama kapa Ntate. Ena ke mohala wa kgopotso o tswang ho ${CLINIC_NAME}. Dumela ${firstName}. Sena se o hopotsa ka kopano ya hao ka ${apptDate} ka ${apptTime}. Ka kopo o se ke wa lebala ho tla le karata ya hao ya kliniki le libotlolo tsohle tsa meriana ya hao. Hopola ho nwa meriana ya hao letsatsi le letsatsi, leha o ikutlwa o fola. Haeba o qetile meriana ya hao, tloo ho tla nka e nngwe kliniking. Ka kopo o se ke wa arolelana meriana ya hao le mang kapa mang. Nwa dipilisi tsa hao ka nako e tshwanang letsatsi le letsatsi, hoseng, thapama le mantsiboya. O se ke wa lebala ho hlahloba kgatello ya madi ya hao letsatsi le letsatsi. Ja letswai le lenyane le tswekere e nyane. Tsamaya metsotso e leshome le metso e mehlano letsatsi le letsatsi. Nwa bonyane digalase tse tsheletseng tsa metsi letsatsi le letsatsi. O se ke wa tsuba, mme o se ke wa nwa jwala. Haeba o sa kgone ho tla, ka kopo re letsetse ho ${CALLBACK_NUMBER}. Nomoro eo hape: ${CALLBACK_NUMBER}. Ka kopo e ngole fatshe. Kea leboha, Mama kapa Ntate. Dula o phetse hantle. Sala hantle.`,

            'ts': `Xewani Mama kumbe Tatana. Lowu i riqingho ro tsundzuxa leswaku u ta eka ${CLINIC_NAME}. Xewani ${firstName}. Leswi i ku tsundzuxa hi nkarhi wa nhlangano wa wena hi ${apptDate} hi ${apptTime}. Hi kombela u nga rivali ku ta na khadhi ya wena ya kiliniki ni mabodlolo hinkwawo ya murhi wa wena. Tsundzuka ku nwa murhi wa wena siku ni siku, hambi loko u titwa u hola. Loko u hetile murhi wa wena, ta u ta teka wun'wana ekiliniki. Hi kombela u nga aveli murhi wa wena ni munhu un'wana. Nwa tipilisi ta wena hi nkarhi lowu fanaka siku ni siku, nimixo, nindzhenga ni nimadyambu. U nga rivali ku kambisisa mpfilumpfilu wa ngati wa wena siku ni siku. Dya munyu wutsongo ni chukele litsongo. Famba timinete ta khume na ntihanu siku ni siku. Nwa swikapu swa mati swa tsevu siku ni siku. U nga dzahi, naswona u nga nwi byalwa. Loko u nga swi koti ku ta, hi kombela u hi fonela eka ${CALLBACK_NUMBER}. Nomboro leyi kambe: ${CALLBACK_NUMBER}. Hi kombela u yi tsala ehansi. Inkomu, Mama kumbe Tatana. Tshama u hantle. Sala kahle.`,

            'tn': `Dumela Mme kgotsa Rre. O o mogala wa kgakololo go tswa kwa ${CLINIC_NAME}. Dumela ${firstName}. Seno se go gopotsa ka kopano ya gago ka ${apptDate} ka ${apptTime}. Tsweetswee o seka wa lebala go tla le karata ya gago ya kliniki le dibotlolo tsotlhe tsa sebolayamalwetse sa gago. Gakologelwa go nwa sebolayamalwetse sa gago letsatsi le letsatsi, le fa o ikutlwa o fodile. Fa o fedile sebolayamalwetse sa gago, tla go tsaya se sengwe kwa kliniki. Tsweetswee o seka wa abelana sebolayamalwetse sa gago le ope. Nwa dipilisi tsa gago ka nako e e tshwanang letsatsi le letsatsi, mo mosong, mo maitsebong le mo maitseboeng. O seka wa lebala go lekanya kgatelelo ya madi ya gago letsatsi le letsatsi. Ja letswai le lennye le sukiri e nnye. Tsamaya metsotso e le lesome le botlhano letsatsi le letsatsi. Nwa digalase tse thataro tsa metsi letsatsi le letsatsi. O seka wa goga, mme o seka wa nwa bojalwa. Fa o sa kgone go tla, tsweetswee re leletse kwa ${CALLBACK_NUMBER}. Nomoro eo gape: ${CALLBACK_NUMBER}. Tsweetswee e kwale fa fatshe. Ke a leboga, Mme kgotsa Rre. Nna o itekanetse. Tsamaya sentle.`,

            'xh': `Molo Mama okanye Tata. Olu lucingo lwesikhumbuzo oluvela kwi-${CLINIC_NAME}. Molo ${firstName}. Oku kukukhumbuza ngeshedyuli yakho nge-${apptDate} nge-${apptTime}. Nceda ungalibali ukuza nekhadi lakho lekliniki kunye nazo zonke iibhotile zamayeza akho. Khumbula ukusela amayeza akho yonke imihla, nokuba uziva ungcono. Ukuba ugqibile amayeza akho, yiza kuthatha amanye ekliniki. Nceda ungabelani ngamayeza akho namntu. Sela iipilisi zakho ngexesha elifanayo yonke imihla, kusasa, emva kwemini nangokuhlwa. Ungalibali ukujonga uxinzelelo lwegazi lakho yonke imihla. Yitya ityuwa encinci kunye neswekile encinci. Hamba imizuzu elishumi elinesihlanu yonke imihla. Sela iiglasi ezintandathu zamanzi ubuncinane yonke imihla. Ungatshayi, kwaye ungseli tywala. Ukuba awukwazi ukuza, nceda usitsalele umnxeba kwi-${CALLBACK_NUMBER}. Loo nombolo kwakhona: ${CALLBACK_NUMBER}. Nceda uyibhale phantsi. Enkosi, Mama okanye Tata. Hlala uphilile. Hamba kakuhle.`,

            've': `Ndaa Mma kana Khotsi. Hei ndi luá¹±ingo lwa tsitsinyeho lu bva kha ${CLINIC_NAME}. Ndaa ${firstName}. Hei ndi u humbudza nga tshifhinga tsha u dzhenelela nga ${apptDate} nga ${apptTime}. Ri humbela ni songo hangwa u da na khaá¸“i ya kliá¹‹iki na dzibodlelo dzothe dza mishonga yavho. Humbulani u nwa mishonga yavho á¸“uvha á¸½iá¹…we na á¸½iá¹…we, naho ni tshi pfa ni fhola. Arali no fhedza mishonga yavho, á¸“ani ni á¸“o dzhia miá¹…we kiliniki. Ri humbela ni songo kovhakana mishonga yavho na muthu. Nwani dipilisi dzavho nga tshifhinga tshithihi á¸“uvha á¸½iá¹…we na á¸½iá¹…we, matsheloni, masiari na madekwana. Ni songo hangwa u kala muvhigo wa ngati yavho á¸“uvha á¸½iá¹…we na á¸½iá¹…we. á¸¶ani munyu muá¹±uku na swigiri á¹±uku. Tshenzhelani mimunithi ya fumi na á¹±hanu á¸“uvha á¸½iá¹…we na á¸½iá¹…we. Nwani dzigalasi dza rathi dza maá¸“i á¸“uvha á¸½iá¹…we na á¸½iá¹…we. Ni songo fhisa, na u nwa halwa. Arali ni sa kone u da, ri fareleni kha ${CALLBACK_NUMBER}. Inombolo iyi hafhu: ${CALLBACK_NUMBER}. Ri humbela ni i á¹…wale fhasi. Ndo livhuwa, Mma kana Khotsi. Salani no fhola. Ni sale mulwadze.`,

            'nso': `Dumela Mma goba Tate. Ye ke mogala wa kgopotso wo tÅ¡wago go ${CLINIC_NAME}. Dumela ${firstName}. Ye ke go gopodiÅ¡a ka kopano ya gago ka ${apptDate} ka ${apptTime}. Hlokomela o seke wa lebala go tla le karata ya gago ya kliniki le dibotlolo ka moka tÅ¡a meriana ya gago. Gopola go nwa meriana ya gago letÅ¡atÅ¡i ka letÅ¡atÅ¡i, le ge o ikwa o fola. Ge o fedile meriana ya gago, tlo go tÅ¡ea ye nngwe kwa kliniki. Hlokomela o seke wa abelana meriana ya gago le motho. Nwa dipilisi tÅ¡a gago ka nako ye tee letÅ¡atÅ¡i ka letÅ¡atÅ¡i, mesong, mantsiboya le boÅ¡ego. O seke wa lebala go lekola kgatelelo ya madi ya gago letÅ¡atÅ¡i ka letÅ¡atÅ¡i. Eja letswai le lennyane le swikiri e nnyane. Sepela metsotso ye lesome le hlano letÅ¡atÅ¡i ka letÅ¡atÅ¡i. Nwa digalase tÅ¡e tshela tÅ¡a meetse letÅ¡atÅ¡i ka letÅ¡atÅ¡i. O seke wa kgoga, ebile o seke wa nwa bjalwa. Ge o sa kgone go tla, hle re leletÅ¡e go ${CALLBACK_NUMBER}. Nomoro yeo gape: ${CALLBACK_NUMBER}. Hle e ngwale fase. Ke a leboga, Mma goba Tate. Dula o phetÅ¡e gabotse. Å ala gabotse.`
        };

        return (elderlyScripts[lang] || elderlyScripts['en'])
            .replace(/\s+/g, ' ')
            .trim();
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // STANDARD SCRIPTS (Under 60)
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const standardScripts = {
        'en': `Good day. This is a reminder call from ${CLINIC_NAME}. Hello ${firstName}. This is to remind you of your appointment on ${apptDate} at ${apptTime}. Please remember to bring your clinic card and any medication you are currently taking. If you cannot make it, please call us at ${CALLBACK_NUMBER}. That number again: ${CALLBACK_NUMBER}. Thank you. Goodbye.`,

        'zu': `Sawubona. Lolu wucingo lwesikhumbuzo oluvela e-${CLINIC_NAME}. Sawubona ${firstName}. Lokhu kukukhumbuza ngesikhathi sakho sokuhlangana ngo-${apptDate} ngo-${apptTime}. Sicela ukhumbule ukuphatha ikhadi lakho lasemtholampilo kanye nanoma yimiphi imithi oyiphuzayo. Uma ungakwazi ukuza, sicela usishayele ucingo ku-${CALLBACK_NUMBER}. Leyo nombolo futhi: ${CALLBACK_NUMBER}. Ngiyabonga. Sala kahle.`,

        'af': `Goeie dag. Hierdie is 'n herinnering oproep van ${CLINIC_NAME}. Hallo ${firstName}. Dit is om jou te herinner aan jou afspraak op ${apptDate} om ${apptTime}. Onthou asseblief om jou kliniekkaart en enige medikasie wat jy tans gebruik, saam te bring. As jy nie kan kom nie, skakel ons by ${CALLBACK_NUMBER}. Daardie nommer weer: ${CALLBACK_NUMBER}. Dankie. Totsiens.`,

        'st': `Dumela. Ena ke mohala wa kgopotso o tswang ho ${CLINIC_NAME}. Dumela ${firstName}. Sena se o hopotsa ka kopano ya hao ka ${apptDate} ka ${apptTime}. Ka kopo hopola ho tla le karata ya hao ya kliniki le meriana efe kapa efe eo o e nkang. Haeba o sa kgone ho tla, ka kopo re letsetse ho ${CALLBACK_NUMBER}. Nomoro eo hape: ${CALLBACK_NUMBER}. Kea leboha. Sala hantle.`,

        'ts': `Xewani. Lowu i riqingho ro tsundzuxa leswaku u ta eka ${CLINIC_NAME}. Xewani ${firstName}. Leswi i ku tsundzuxa hi nkarhi wa nhlangano wa wena hi ${apptDate} hi ${apptTime}. Hi kombela u tsundzuka ku ta na khadhi ya wena ya kiliniki ni murhi lowu wu nwaka. Loko u nga swi koti ku ta, hi kombela u hi fonela eka ${CALLBACK_NUMBER}. Nomboro leyi kambe: ${CALLBACK_NUMBER}. Inkomu. Sala kahle.`,

        'tn': `Dumela. O o mogala wa kgakololo go tswa kwa ${CLINIC_NAME}. Dumela ${firstName}. Seno se go gopotsa ka kopano ya gago ka ${apptDate} ka ${apptTime}. Tsweetswee gakologelwa go tla le karata ya gago ya kliniki le meriana epe fela e o e tsayang. Fa o sa kgone go tla, tsweetswee re leletse kwa ${CALLBACK_NUMBER}. Nomoro eo gape: ${CALLBACK_NUMBER}. Ke a leboga. Tsamaya sentle.`,

        'xh': `Molo. Olu lucingo lwesikhumbuzo oluvela kwi-${CLINIC_NAME}. Molo ${firstName}. Oku kukukhumbuza ngeshedyuli yakho nge-${apptDate} nge-${apptTime}. Nceda ukhumbule ukuza nekhadi lakho lekliniki kunye nawo onke amayeza owasebenzisayo. Ukuba awukwazi ukuza, nceda usitsalele umnxeba kwi-${CALLBACK_NUMBER}. Loo nombolo kwakhona: ${CALLBACK_NUMBER}. Enkosi. Hamba kakuhle.`,

        've': `Ndaa. Hei ndi luá¹±ingo lwa tsitsinyeho lu bva kha ${CLINIC_NAME}. Ndaa ${firstName}. Hei ndi u humbudza nga tshifhinga tsha u dzhenelela nga ${apptDate} nga ${apptTime}. Ni humbule u da na khaá¸“i ya kliá¹‹iki na mishonga ine na khou i shumisa. Arali ni sa kone u da, ni ri farele kha ${CALLBACK_NUMBER}. Inombolo iyi hafhu: ${CALLBACK_NUMBER}. Ndo livhuwa. Ni sale mulwadze.`,

        'nso': `Dumela. Ye ke mogala wa kgopotso wo tÅ¡wago go ${CLINIC_NAME}. Dumela ${firstName}. Ye ke go gopodiÅ¡a ka kopano ya gago ka ${apptDate} ka ${apptTime}. Hlokomela go tla le karata ya gago ya kliniki le meriana yeo o e nwago. Ge o sa kgone go tla, hle re leletÅ¡e go ${CALLBACK_NUMBER}. Nomoro yeo gape: ${CALLBACK_NUMBER}. Ke a leboga. Å ala gabotse.`
    };

    return (standardScripts[lang] || standardScripts['en'])
        .replace(/\s+/g, ' ')
        .trim();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EMAIL HTML GENERATOR
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function generateEmailHtml(patient) {
    const lang = normalizeLanguage(patient.language);
    const age = parseInt(patient.age) || 0;
    const isElderly = age >= ELDERLY_AGE_THRESHOLD;
    const firstName = patient.first_name || 'Patient';

    const apptDate = patient.appointment_date 
        ? new Date(patient.appointment_date).toLocaleDateString('en-ZA', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        })
        : 'your next visit';
    
    const apptTime = patient.appointment_time || 'your scheduled time';

    const translations = {
        'en': {
            title: 'Appointment Reminder',
            greeting: `Dear ${firstName},`,
            intro: `This is a friendly reminder of your upcoming appointment at ${CLINIC_NAME}.`,
            apptDate: 'Appointment Date',
            apptTime: 'Time',
            bring: 'Please remember to bring:',
            items: ['Your clinic card', 'All your medicine bottles', 'Your ID document'],
            elderlyExtra: {
                title: 'â­ Important for You:',
                tips: [
                    'Take your medication every day, even when you feel well',
                    'Take your pills at the same time every day â€” morning, afternoon, and evening',
                    'Come and collect more medication when you have finished',
                    'Never share your medication with anyone',
                    'Check your blood pressure every day',
                    'Eat less salt and less sugar',
                    'Walk for 15 minutes every day',
                    'Drink at least 6 glasses of water every day',
                    'Do not smoke, and do not drink alcohol'
                ]
            },
            reschedule: 'If you cannot make it, please contact us to reschedule.',
            callUs: 'Call us:',
            thanks: 'Thank you,',
            team: `${CLINIC_NAME} Team`
        }
    };

    const t = translations[lang] || translations['en'];

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">ðŸ¥ ${CLINIC_NAME}</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                <h2 style="color: #1e293b; margin-top: 0;">${t.title}</h2>
                <p style="color: #475569;">${t.greeting}</p>
                <p style="color: #475569;">${t.intro}</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
                    <p style="margin: 8px 0; color: #1e293b;"><strong>ðŸ“… ${t.apptDate}:</strong> ${apptDate}</p>
                    <p style="margin: 8px 0; color: #1e293b;"><strong>â° ${t.apptTime}:</strong> ${apptTime}</p>
                </div>
                
                <p style="color: #475569;"><strong>${t.bring}</strong></p>
                <ul style="color: #475569;">
                    ${t.items.map(item => `<li>${item}</li>`).join('')}
                </ul>

                ${isElderly && t.elderlyExtra ? `
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">${t.elderlyExtra.title}</h3>
                    <ul style="color: #78350f; margin: 0; padding-left: 20px; line-height: 1.8;">
                        ${t.elderlyExtra.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <p style="color: #475569;">${t.reschedule}</p>
                
                <div style="background: #dbeafe; padding: 14px 18px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                    <p style="margin: 0; color: #1e40af;"><strong>ðŸ“ž ${t.callUs}</strong> <span style="font-size: 18px; font-family: monospace; font-weight: bold;">${CALLBACK_NUMBER}</span></p>
                </div>
                
                <p style="color: #475569;">${t.thanks}<br><strong>${t.team}</strong></p>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                    This is an automated reminder. Please do not reply to this email.
                </p>
            </div>
        </div>
    `;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// GET PATIENTS WITH UPCOMING APPOINTMENTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/upcoming', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const numDays = parseInt(days) || 7;

        console.log(`ðŸ” Fetching reminders for next ${numDays} days...`);

        const patients = await db.query(
            `SELECT 
                p.patient_id,
                p.patient_code,
                p.first_name,
                p.last_name,
                p.phone_number AS phone,
                p.email,
                p.date_of_birth,
                p.preferred_language AS language,
                p.age,
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.appointment_type,
                DATEDIFF(a.appointment_date, CURDATE()) AS days_until
            FROM patients p
            INNER JOIN appointments a ON p.patient_id = a.patient_id
            WHERE a.appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
                AND a.status IN ('scheduled', 'confirmed')
            ORDER BY a.appointment_date ASC`,
            [numDays]
        );

        console.log(`âœ… Found ${patients.length} upcoming appointments`);

        res.json({
            success: true,
            data: patients || [],
            count: (patients || []).length,
            twilio_configured: twilioConfigured,
            callback_number: CALLBACK_NUMBER,
            clinic_name: CLINIC_NAME
        });
    } catch (error) {
        console.error('âŒ Get upcoming error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming appointments',
            error: error.message
        });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PREVIEW SCRIPT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.get('/preview-script/:patientId', async (req, res) => {
    try {
        const patients = await db.query(
            `SELECT 
                p.first_name, p.last_name, 
                p.preferred_language AS language,
                p.age,
                a.appointment_date, a.appointment_time
            FROM patients p
            LEFT JOIN appointments a ON p.patient_id = a.patient_id 
                AND a.appointment_date >= CURDATE()
                AND a.status IN ('scheduled', 'confirmed')
            WHERE p.patient_id = ?
            ORDER BY a.appointment_date ASC
            LIMIT 1`,
            [req.params.patientId]
        );

        if (patients.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const patient = patients[0];
        const script = generateVoiceScript(patient);
        const isElderly = (patient.age || 0) >= ELDERLY_AGE_THRESHOLD;

        res.json({
            success: true,
            data: {
                script: script,
                language: normalizeLanguage(patient.language),
                age: patient.age,
                is_elderly: isElderly,
                speech_rate: isElderly ? 0.75 : 0.9,
                speech_pitch: isElderly ? 1.05 : 1.0
            }
        });
    } catch (error) {
        console.error('âŒ Preview script error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// REAL PHONE CALL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/make-call', async (req, res) => {
    try {
        const { patient_id, phone, appointment_id } = req.body;

        if (!patient_id || !phone) {
            return res.status(400).json({ success: false, message: 'Patient ID and phone required' });
        }

        const patients = await db.query(
            `SELECT 
                p.first_name, p.last_name, 
                p.preferred_language AS language,
                p.age,
                a.appointment_date, a.appointment_time
            FROM patients p
            LEFT JOIN appointments a ON p.patient_id = a.patient_id 
                AND a.appointment_date >= CURDATE()
                AND a.status IN ('scheduled', 'confirmed')
            WHERE p.patient_id = ?
            ORDER BY a.appointment_date ASC
            LIMIT 1`,
            [patient_id]
        );

        if (patients.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const patient = patients[0];
        const script = generateVoiceScript(patient);

        if (!twilioConfigured || !twilioClient) {
            console.log(`ðŸ“ž [SIMULATED] Would call ${phone}`);
            return res.json({
                success: true,
                simulated: true,
                message: 'âš ï¸ Twilio not configured â€” call simulated',
                data: { to: phone, language: normalizeLanguage(patient.language), script }
            });
        }

        const escapeXml = (str) => str
            .replace(/&/g, 'and')
            .replace(/</g, ' ')
            .replace(/>/g, ' ')
            .replace(/"/g, "'");

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Pause length="1"/>
    <Say voice="Polly.Raveena" language="en-IN">${escapeXml(script)}</Say>
    <Pause length="1"/>
    <Say voice="Polly.Raveena" language="en-IN">Thank you. Goodbye.</Say>
    <Hangup/>
</Response>`;

        const call = await twilioClient.calls.create({
            twiml: twiml,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });

        res.json({
            success: true,
            simulated: false,
            message: `ðŸ“ž Calling ${phone}`,
            data: { sid: call.sid, status: call.status, to: phone, language: normalizeLanguage(patient.language), script }
        });

    } catch (error) {
        console.error('âŒ Call error:', error);
        res.status(500).json({ success: false, message: 'Failed to make call', error: error.message });
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SEND EMAIL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
router.post('/send-email', async (req, res) => {
    try {
        const { patient_id, email, appointment_id } = req.body;

        if (!patient_id || !email) {
            return res.status(400).json({ success: false, message: 'Patient ID and email required' });
        }

        const patients = await db.query(
            `SELECT 
                p.first_name, p.last_name, 
                p.preferred_language AS language,
                p.age,
                a.appointment_date, a.appointment_time
            FROM patients p
            LEFT JOIN appointments a ON p.patient_id = a.patient_id 
                AND a.appointment_date >= CURDATE()
                AND a.status IN ('scheduled', 'confirmed')
            WHERE p.patient_id = ?
            ORDER BY a.appointment_date ASC
            LIMIT 1`,
            [patient_id]
        );

        if (patients.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const patient = patients[0];
        const emailHtml = generateEmailHtml(patient);
        const isElderly = (patient.age || 0) >= ELDERLY_AGE_THRESHOLD;

        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: `Appointment Reminder - ${CLINIC_NAME}`,
            html: emailHtml
        });

        res.json({
            success: true,
            message: `ðŸ“§ Email sent to ${email}`,
            data: { messageId: info.messageId, to: email, is_elderly: isElderly }
        });

    } catch (error) {
        console.error('âŒ Email error:', error);
        res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
    }
});

module.exports = router;
