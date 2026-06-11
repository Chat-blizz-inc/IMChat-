import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search, Globe, Check, Settings, Shield, Info, ChevronDown, ChevronUp, HelpCircle, Users, Bell } from 'lucide-react';
import LanguagesIcon from './components/LanguagesIcon';

interface Language {
  name: string;
  nativeName: string;
  code: string;
}

const LANGUAGES: Language[] = [
  { name: 'English', nativeName: 'English', code: 'en' },
  { name: 'Spanish', nativeName: 'Español', code: 'es' },
  { name: 'French', nativeName: 'Français', code: 'fr' },
  { name: 'German', nativeName: 'Deutsch', code: 'de' },
  { name: 'Chinese (Simplified)', nativeName: '简体中文', code: 'zh' },
  { name: 'Chinese (Traditional)', nativeName: '繁體中文', code: 'zh-TW' },
  { name: 'Japanese', nativeName: '日本語', code: 'ja' },
  { name: 'Korean', nativeName: '한국어', code: 'ko' },
  { name: 'Arabic', nativeName: 'العربية', code: 'ar' },
  { name: 'Russian', nativeName: 'Русский', code: 'ru' },
  { name: 'Portuguese', nativeName: 'Português', code: 'pt' },
  { name: 'Italian', nativeName: 'Italiano', code: 'it' },
  { name: 'Turkish', nativeName: 'Türkçe', code: 'tr' },
  { name: 'Dutch', nativeName: 'Nederlands', code: 'nl' },
  { name: 'Polish', nativeName: 'Polski', code: 'pl' },
  { name: 'Vietnamese', nativeName: 'Tiếng Việt', code: 'vi' },
  { name: 'Thai', nativeName: 'ไทย', code: 'th' },
  { name: 'Indonesian', nativeName: 'Bahasa Indonesia', code: 'id' },
  { name: 'Hindi', nativeName: 'हिन्दी', code: 'hi' },
  { name: 'Bengali', nativeName: 'বাংলা', code: 'bn' },
  { name: 'Greek', nativeName: 'Ελληνικά', code: 'el' },
  { name: 'Czech', nativeName: 'Čeština', code: 'cs' },
  { name: 'Swedish', nativeName: 'Svenska', code: 'sv' },
  { name: 'Danish', nativeName: 'Dansk', code: 'da' },
  { name: 'Finnish', nativeName: 'Suomi', code: 'fi' },
  { name: 'Norwegian', nativeName: 'Norsk', code: 'no' },
  { name: 'Hungarian', nativeName: 'Magyar', code: 'hu' },
  { name: 'Romanian', nativeName: 'Română', code: 'ro' },
  { name: 'Ukrainian', nativeName: 'Українська', code: 'uk' },
  { name: 'Hebrew', nativeName: 'עברית', code: 'he' },
  { name: 'Malay', nativeName: 'Bahasa Melayu', code: 'ms' },
  { name: 'Persian', nativeName: 'فارسی', code: 'fa' },
  { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', code: 'pa' },
  { name: 'Tamil', nativeName: 'தமிழ்', code: 'ta' },
  { name: 'Telugu', nativeName: 'తెలుగు', code: 'te' },
  { name: 'Marathi', nativeName: 'मराठी', code: 'mr' },
  { name: 'Urdu', nativeName: 'اردو', code: 'ur' },
  { name: 'Gujarati', nativeName: 'ગુજરાતી', code: 'gu' },
  { name: 'Kannada', nativeName: 'ಕನ್ನಡ', code: 'kn' },
  { name: 'Malayalam', nativeName: 'മലയാളം', code: 'ml' },
  { name: 'Filipino', nativeName: 'Filipino', code: 'fil' },
  { name: 'Swahili', nativeName: 'Kiswahili', code: 'sw' },
  { name: 'Amharic', nativeName: 'አማርኛ', code: 'am' },
  { name: 'Yoruba', nativeName: 'Yorùbá', code: 'yo' },
  { name: 'Igbo', nativeName: 'Asụsụ Igbo', code: 'ig' },
  { name: 'Zulu', nativeName: 'isiZulu', code: 'zu' },
  { name: 'Xhosa', nativeName: 'isiXhosa', code: 'xh' },
  { name: 'Afrikaans', nativeName: 'Afrikaans', code: 'af' },
  { name: 'Finnish', nativeName: 'Suomi', code: 'fi' },
  { name: 'Bulgarian', nativeName: 'Български', code: 'bg' },
  { name: 'Croatian', nativeName: 'Hrvatski', code: 'hr' },
  { name: 'Serbian', nativeName: 'Српски', code: 'sr' },
  { name: 'Slovak', nativeName: 'Slovenčina', code: 'sk' },
  { name: 'Slovenian', nativeName: 'Slovenščina', code: 'sl' },
  { name: 'Estonian', nativeName: 'Eesti', code: 'et' },
  { name: 'Latvian', nativeName: 'Latviešu', code: 'lv' },
  { name: 'Lithuanian', nativeName: 'Lietuvių', code: 'lt' },
  { name: 'Albanian', nativeName: 'Shqip', code: 'sq' },
  { name: 'Macedonian', nativeName: 'Македонски', code: 'mk' },
  { name: 'Georgian', nativeName: 'ქართული', code: 'ka' },
  { name: 'Armenian', nativeName: 'Հայերեն', code: 'hy' },
  { name: 'Azerbaijani', nativeName: 'Azərbaycanca', code: 'az' },
  { name: 'Kazakh', nativeName: 'Қазақ тілі', code: 'kk' },
  { name: 'Uzbek', nativeName: 'Oʻzbekcha', code: 'uz' },
  { name: 'Kyrgyz', nativeName: 'Кыргызча', code: 'ky' },
  { name: 'Tajik', nativeName: 'Тоҷикӣ', code: 'tg' },
  { name: 'Turkmen', nativeName: 'Türkmençe', code: 'tk' },
  { name: 'Mongolian', nativeName: 'Монгол', code: 'mn' },
  { name: 'Burmese', nativeName: 'မြန်မာဘာသာ', code: 'my' },
  { name: 'Khmer', nativeName: 'ភាសាខ្មែរ', code: 'km' },
  { name: 'Lao', nativeName: 'ພາສາລາວ', code: 'lo' },
  { name: 'Sinhala', nativeName: 'සිංහල', code: 'si' },
  { name: 'Nepali', nativeName: 'नेपाली', code: 'ne' },
  { name: 'Pashto', nativeName: 'پښتو', code: 'ps' },
  { name: 'Kurdish', nativeName: 'Kurdî', code: 'ku' },
  { name: 'Somali', nativeName: 'Soomaali', code: 'so' },
  { name: 'Oromo', nativeName: 'Oromoo', code: 'om' },
  { name: 'Tigrigna', nativeName: 'ትግርኛ', code: 'ti' },
  { name: 'Malagasy', nativeName: 'Malagasy', code: 'mg' },
  { name: 'Kamba', nativeName: 'Kikamba', code: 'kam' },
  { name: 'Luo', nativeName: 'Dholuo', code: 'luo' },
  { name: 'Kikuyu', nativeName: 'Gikuyu', code: 'ki' },
  { name: 'Kalenzin', nativeName: 'Kalenjin', code: 'kln' },
  { name: 'Maasai', nativeName: 'Maa', code: 'mas' },
  { name: 'Chichewa', nativeName: 'Chichewa', code: 'ny' },
  { name: 'Shona', nativeName: 'chiShona', code: 'sn' },
  { name: 'Sesotho', nativeName: 'Sesotho', code: 'st' },
  { name: 'Tswana', nativeName: 'Setswana', code: 'tn' },
  { name: 'Ndebele', nativeName: 'isiNdebele', code: 'nd' },
  { name: 'Venda', nativeName: 'Tshivenḓa', code: 've' },
  { name: 'Tsonga', nativeName: 'Xitsonga', code: 'ts' },
  { name: 'Swati', nativeName: 'SiSwati', code: 'ss' },
  { name: 'Twi', nativeName: 'Twi', code: 'tw' },
  { name: 'Ewe', nativeName: 'Èvègbè', code: 'ee' },
  { name: 'Ga', nativeName: 'Gã', code: 'ga' },
  { name: 'Hausa', nativeName: 'Hausa', code: 'ha' },
  { name: 'Fulfulde', nativeName: 'Fulfulde', code: 'ff' },
  { name: 'Wolof', nativeName: 'Wolof', code: 'wo' },
  { name: 'Bambara', nativeName: 'Bamanankan', code: 'bm' },
  { name: 'Mende', nativeName: 'Mɛnde yia', code: 'men' },
  { name: 'Temne', nativeName: 'Kǝthemnɛ', code: 'tem' },
  { name: 'Krio', nativeName: 'Krio', code: 'kri' },
  { name: 'Luganda', nativeName: 'Oluganda', code: 'lg' },
  { name: 'Runyankole', nativeName: 'Runyankore', code: 'nyn' },
  { name: 'Lusoga', nativeName: 'Lusoga', code: 'xog' },
  { name: 'Lugisu', nativeName: 'Lumasaba', code: 'myx' },
  { name: 'Luhya', nativeName: 'Oluluyia', code: 'luy' },
  { name: 'Kimeru', nativeName: 'Kimeru', code: 'mer' },
  { name: 'Kiembu', nativeName: 'Kiembu', code: 'ebu' },
  { name: 'Kipsigis', nativeName: 'Kipsigis', code: 'sgc' },
  { name: 'Nandi', nativeName: 'Nandi', code: 'pko' },
  { name: 'Teso', nativeName: 'Ateso', code: 'teo' },
  { name: 'Acholi', nativeName: 'Luo', code: 'ach' },
  { name: 'Lango', nativeName: 'Lango', code: 'laj' },
  { name: 'Alur', nativeName: 'Alur', code: 'alz' },
  { name: 'Madi', nativeName: 'Ma\'di', code: 'mhi' },
  { name: 'Lugbara', nativeName: 'Lugbara', code: 'lgg' },
  { name: 'Kakwa', nativeName: 'Kakwa', code: 'keo' },
  { name: 'Nubian', nativeName: 'Nobiin', code: 'fia' },
  { name: 'Dinka', nativeName: 'Thuɔŋjäŋ', code: 'din' },
  { name: 'Nuer', nativeName: 'Thok Nath', code: 'nus' },
  { name: 'Zande', nativeName: 'Pazande', code: 'zne' },
  { name: 'Bari', nativeName: 'Bari', code: 'bfa' },
  { name: 'Lotuko', nativeName: 'Otuho', code: 'lot' },
  { name: 'Toposa', nativeName: 'Toposa', code: 'toq' },
  { name: 'Mundari', nativeName: 'Mundari', code: 'mqu' },
  { name: 'Nyangatom', nativeName: 'Nyangatom', code: 'nnj' },
  { name: 'Didinga', nativeName: 'Didinga', code: 'did' },
  { name: 'Boya', nativeName: 'Larim', code: 'rmz' },
  { name: 'Murle', nativeName: 'Murle', code: 'mur' },
  { name: 'Jiye', nativeName: 'Jiye', code: 'jye' },
  { name: 'Kachipo', nativeName: 'Kachipo', code: 'koe' },
  { name: 'Surma', nativeName: 'Suri', code: 'suq' },
  { name: 'Anyuak', nativeName: 'Anuak', code: 'anu' },
  { name: 'Shilluk', nativeName: 'Dhøg Cøllø', code: 'shk' },
  { name: 'Maban', nativeName: 'Mabaan', code: 'mfz' },
  { name: 'Uduk', nativeName: 'Uduk', code: 'udu' },
  { name: 'Berta', nativeName: 'Berta', code: 'wom' },
  { name: 'Gumuz', nativeName: 'Gumuz', code: 'guz' },
  { name: 'Shinasha', nativeName: 'Boro', code: 'bwo' },
  { name: 'Agaw', nativeName: 'Agaw', code: 'awn' },
  { name: 'Kunama', nativeName: 'Kunama', code: 'kun' },
  { name: 'Nara', nativeName: 'Nara', code: 'nrb' },
  { name: 'Saho', nativeName: 'Saho', code: 'ssy' },
  { name: 'Afar', nativeName: 'Qafaraf', code: 'aa' },
  { name: 'Beja', nativeName: 'Bedawiyet', code: 'bej' },
  { name: 'Hadendowa', nativeName: 'Hadendoa', code: 'haq' },
  { name: 'Bisharin', nativeName: 'Bisharin', code: 'biq' },
  { name: 'Ababda', nativeName: 'Ababda', code: 'abq' },
  { name: 'Rashaida', nativeName: 'Rashaida', code: 'raq' },
  { name: 'Zabadi', nativeName: 'Zabadi', code: 'zaq' },
  { name: 'Baggara', nativeName: 'Baggara', code: 'baq' },
  { name: 'Misseriya', nativeName: 'Misseriya', code: 'miq' },
  { name: 'Rizeigat', nativeName: 'Rizeigat', code: 'riq' },
  { name: 'Habbaniya', nativeName: 'Habbaniya', code: 'haq' },
  { name: 'Ta\'aisha', nativeName: 'Ta\'aisha', code: 'taq' },
  { name: 'Beni Halba', nativeName: 'Beni Halba', code: 'beq' },
  { name: 'Ma\'alia', nativeName: 'Ma\'alia', code: 'maq' },
  { name: 'Salamat', nativeName: 'Salamat', code: 'saq' },
  { name: 'Masalit', nativeName: 'Masalit', code: 'msq' },
  { name: 'Fur', nativeName: 'Fur', code: 'fvr' },
  { name: 'Zaghawa', nativeName: 'Beria', code: 'zag' },
  { name: 'Tama', nativeName: 'Tama', code: 'tma' },
  { name: 'Mararit', nativeName: 'Mararit', code: 'mrt' },
  { name: 'Mimi', nativeName: 'Mimi', code: 'miq' },
  { name: 'Sungor', nativeName: 'Sungor', code: 'suq' },
  { name: 'Daju', nativeName: 'Daju', code: 'dau' },
  { name: 'Sila', nativeName: 'Sila', code: 'siq' },
  { name: 'Sinyar', nativeName: 'Sinyar', code: 'sys' },
  { name: 'Fongoro', nativeName: 'Fongoro', code: 'fgy' },
  { name: 'Aiki', nativeName: 'Aiki', code: 'aik' },
  { name: 'Kibet', nativeName: 'Kibet', code: 'kie' },
  { name: 'Daggal', nativeName: 'Daggal', code: 'daq' },
  { name: 'Muro', nativeName: 'Muro', code: 'muq' },
  { name: 'Dago', nativeName: 'Dago', code: 'dgq' },
  { name: 'Baygo', nativeName: 'Baygo', code: 'byg' },
  { name: 'Njalgulgule', nativeName: 'Njalgulgule', code: 'njl' },
  { name: 'Shatt', nativeName: 'Shatt', code: 'shq' },
  { name: 'Liguri', nativeName: 'Liguri', code: 'liu' },
  { name: 'Tagoi', nativeName: 'Tagoi', code: 'tag' },
  { name: 'Tingal', nativeName: 'Tingal', code: 'tie' },
  { name: 'Tukkum', nativeName: 'Tukkum', code: 'tuq' },
  { name: 'Turum', nativeName: 'Turum', code: 'tum' },
  { name: 'Katcha', nativeName: 'Katcha', code: 'kce' },
  { name: 'Kadugli', nativeName: 'Kadugli', code: 'xtc' },
  { name: 'Krongo', nativeName: 'Krongo', code: 'kgo' },
  { name: 'Tumtum', nativeName: 'Tumtum', code: 'tsh' },
  { name: 'Keiga', nativeName: 'Keiga', code: 'kec' },
  { name: 'Kanga', nativeName: 'Kanga', code: 'kox' },
  { name: 'Miri', nativeName: 'Miri', code: 'mrg' },
  { name: 'Tulu', nativeName: 'Tulu', code: 'tuu' },
  { name: 'Kadaru', nativeName: 'Kadaru', code: 'kdu' },
  { name: 'Ghulfan', nativeName: 'Ghulfan', code: 'ghl' },
  { name: 'El Hugeirat', nativeName: 'El Hugeirat', code: 'elh' },
  { name: 'Dair', nativeName: 'Dair', code: 'dri' },
  { name: 'Shwai', nativeName: 'Shwai', code: 'shw' },
  { name: 'Tira', nativeName: 'Tira', code: 'tir' },
  { name: 'Moro', nativeName: 'Moro', code: 'mor' },
  { name: 'Otoro', nativeName: 'Otoro', code: 'otr' },
  { name: 'Heiban', nativeName: 'Heiban', code: 'hbn' },
  { name: 'Laro', nativeName: 'Laro', code: 'lro' },
  { name: 'Ko', nativeName: 'Ko', code: 'fuj' },
  { name: 'Warnang', nativeName: 'Warnang', code: 'wrn' },
  { name: 'Kau', nativeName: 'Kau', code: 'kqo' },
  { name: 'Werni', nativeName: 'Werni', code: 'wrq' },
  { name: 'Talodi', nativeName: 'Talodi', code: 'tlo' },
  { name: 'Lafofa', nativeName: 'Lafofa', code: 'laf' },
  { name: 'Masakin', nativeName: 'Masakin', code: 'msq' },
  { name: 'Buram', nativeName: 'Buram', code: 'buq' },
  { name: 'Dagik', nativeName: 'Dagik', code: 'dec' },
  { name: 'Ngile', nativeName: 'Ngile', code: 'nle' },
  { name: 'Dengebu', nativeName: 'Dengebu', code: 'deq' },
  { name: 'Tocho', nativeName: 'Tocho', code: 'taz' },
  { name: 'Torona', nativeName: 'Torona', code: 'trn' },
  { name: 'Acheron', nativeName: 'Acheron', code: 'acz' },
  { name: 'Lumun', nativeName: 'Lumun', code: 'ldu' },
  { name: 'Tabaq', nativeName: 'Tabaq', code: 'tbc' },
  { name: 'Abu Jinuk', nativeName: 'Abu Jinuk', code: 'abj' },
  { name: 'Abu Sinun', nativeName: 'Abu Sinun', code: 'abs' },
  { name: 'Debas', nativeName: 'Debas', code: 'dbq' },
  { name: 'Dallan', nativeName: 'Dallan', code: 'dlq' },
  { name: 'Karki', nativeName: 'Karki', code: 'krq' },
  { name: 'Vali', nativeName: 'Vali', code: 'vaq' },
  { name: 'Temein', nativeName: 'Temein', code: 'teq' },
  { name: 'Keiga Jirru', nativeName: 'Keiga Jirru', code: 'kjq' },
  { name: 'Teis-um-Danab', nativeName: 'Teis-um-Danab', code: 'tud' },
  { name: 'Katla', nativeName: 'Katla', code: 'kcr' },
  { name: 'Tima', nativeName: 'Tima', code: 'tim' },
  { name: 'Julut', nativeName: 'Julut', code: 'juq' },
  { name: 'Rashad', nativeName: 'Rashad', code: 'rsq' },
  { name: 'Tegali', nativeName: 'Tegali', code: 'ras' },
  { name: 'Kajakja', nativeName: 'Kajakja', code: 'kaq' },
  { name: 'Tumale', nativeName: 'Tumale', code: 'tuq' },
  { name: 'Moreb', nativeName: 'Moreb', code: 'moq' },
  { name: 'Orig', nativeName: 'Orig', code: 'oq' },
  { name: 'Koy', nativeName: 'Koy', code: 'koq' },
  { name: 'Uncu', nativeName: 'Uncu', code: 'unq' },
  { name: 'Tukum', nativeName: 'Tukum', code: 'tuq' },
  { name: 'Turum', nativeName: 'Turum', code: 'tum' },
  { name: 'Koalib', nativeName: 'Koalib', code: 'kib' },
  { name: 'Nyamang', nativeName: 'Nyamang', code: 'nyq' },
  { name: 'Mandal', nativeName: 'Mandal', code: 'maq' },
  { name: 'Afitti', nativeName: 'Afitti', code: 'aft' },
  { name: 'Dinik', nativeName: 'Dinik', code: 'diq' },
  { name: 'Dair', nativeName: 'Dair', code: 'drq' },
  { name: 'Kadaru', nativeName: 'Kadaru', code: 'kdq' },
  { name: 'Ghulfan', nativeName: 'Ghulfan', code: 'ghq' },
  { name: 'Debri', nativeName: 'Debri', code: 'deq' },
  { name: 'Karko', nativeName: 'Karko', code: 'krk' },
  { name: 'Dilling', nativeName: 'Dilling', code: 'dil' },
  { name: 'Wali', nativeName: 'Wali', code: 'wll' },
  { name: 'Fanda', nativeName: 'Fanda', code: 'fan' },
  { name: 'Koldaji', nativeName: 'Koldaji', code: 'kol' },
  { name: 'Meidob', nativeName: 'Meidob', code: 'mei' },
  { name: 'Zaghawa', nativeName: 'Beria', code: 'zag' },
  { name: 'Berti', nativeName: 'Berti', code: 'byt' },
  { name: 'Bisharin', nativeName: 'Bisharin', code: 'biq' },
  { name: 'Ababda', nativeName: 'Ababda', code: 'abq' },
  { name: 'Hadendowa', nativeName: 'Hadendoa', code: 'haq' },
  { name: 'Amarar', nativeName: 'Amarar', code: 'amq' },
  { name: 'Beni Amer', nativeName: 'Beni Amer', code: 'beq' },
  { name: 'Tigre', nativeName: 'Tigre', code: 'tig' },
  { name: 'Afar', nativeName: 'Qafaraf', code: 'aa' },
  { name: 'Saho', nativeName: 'Saho', code: 'ssy' },
  { name: 'Kunama', nativeName: 'Kunama', code: 'kun' },
  { name: 'Nara', nativeName: 'Nara', code: 'nrb' },
  { name: 'Bilin', nativeName: 'Bilen', code: 'byn' },
  { name: 'Beja', nativeName: 'Bedawiyet', code: 'bej' },
  { name: 'Nubian', nativeName: 'Nobiin', code: 'fia' },
  { name: 'Kenzi', nativeName: 'Kenzi', code: 'xnz' },
  { name: 'Dongola', nativeName: 'Dongola', code: 'dnq' },
  { name: 'Mahas', nativeName: 'Mahas', code: 'mhs' },
  { name: 'Fadicca', nativeName: 'Fadicca', code: 'fdq' },
  { name: 'Sukkot', nativeName: 'Sukkot', code: 'suq' },
  { name: 'Archaic Nubian', nativeName: 'Nubian', code: 'onb' },
  { name: 'Berber', nativeName: 'Tamazight', code: 'ber' },
  { name: 'Kabyle', nativeName: 'Taqbaylit', code: 'kab' },
  { name: 'Shilha', nativeName: 'Tachelhit', code: 'shi' },
  { name: 'Riffian', nativeName: 'Tarifit', code: 'rif' },
  { name: 'Shawiya', nativeName: 'Tacawit', code: 'chy' },
  { name: 'Tuareg', nativeName: 'Tamajeq', code: 'tmh' },
  { name: 'Zenaga', nativeName: 'Zenaga', code: 'zen' },
  { name: 'Siwi', nativeName: 'Siwi', code: 'siz' },
  { name: 'Ghadames', nativeName: 'Ghadamès', code: 'gha' },
  { name: 'Nafusi', nativeName: 'Nafusi', code: 'jbn' },
  { name: 'Zuara', nativeName: 'Zuara', code: 'zuq' },
  { name: 'Sokna', nativeName: 'Sokna', code: 'sok' },
  { name: 'Awjila', nativeName: 'Awjila', code: 'auj' },
  { name: 'Jaghabub', nativeName: 'Jaghabub', code: 'jaq' },
  { name: 'Kufra', nativeName: 'Kufra', code: 'kuq' },
  { name: 'Tebu', nativeName: 'Tebou', code: 'tuq' },
  { name: 'Daza', nativeName: 'Dazaga', code: 'dzg' },
  { name: 'Teda', nativeName: 'Tedaga', code: 'tuo' },
  { name: 'Kanuri', nativeName: 'Kanuri', code: 'kr' },
  { name: 'Manga', nativeName: 'Manga', code: 'kby' },
  { name: 'Tumari', nativeName: 'Tumari', code: 'krt' },
  { name: 'Bilma', nativeName: 'Bilma', code: 'bms' },
  { name: 'Dagera', nativeName: 'Dagera', code: 'dgq' },
  { name: 'Borno', nativeName: 'Borno', code: 'boq' },
  { name: 'Yerwa', nativeName: 'Yerwa', code: 'yeq' },
  { name: 'Kwayam', nativeName: 'Kwayam', code: 'kwq' },
  { name: 'Mober', nativeName: 'Mober', code: 'moq' },
  { name: 'Bodai', nativeName: 'Bodai', code: 'boq' },
  { name: 'Kanembu', nativeName: 'Kanembu', code: 'kbh' },
  { name: 'Zarma', nativeName: 'Zarma', code: 'dje' },
  { name: 'Songhay', nativeName: 'Songhay', code: 'son' },
  { name: 'Dendi', nativeName: 'Dendi', code: 'ddn' },
  { name: 'Koyra Chiini', nativeName: 'Koyra Chiini', code: 'khq' },
  { name: 'Koyraboro Senni', nativeName: 'Koyraboro Senni', code: 'ses' },
  { name: 'Humburi Senni', nativeName: 'Humburi Senni', code: 'hmb' },
  { name: 'Tadaksahak', nativeName: 'Tadaksahak', code: 'dsq' },
  { name: 'Tasawaq', nativeName: 'Tasawaq', code: 'twq' },
  { name: 'Tagdal', nativeName: 'Tagdal', code: 'tda' },
  { name: 'Korandje', nativeName: 'Korandje', code: 'kcy' },
  { name: 'Fulfulde', nativeName: 'Fulfulde', code: 'ff' },
  { name: 'Pulaar', nativeName: 'Pulaar', code: 'fuc' },
  { name: 'Pular', nativeName: 'Pular', code: 'fuf' },
  { name: 'Adamawa Fulfulde', nativeName: 'Fulfulde', code: 'fub' },
  { name: 'Bagirmi Fulfulde', nativeName: 'Fulfulde', code: 'fui' },
  { name: 'Central-Eastern Niger Fulfulde', nativeName: 'Fulfulde', code: 'fuq' },
  { name: 'Maasina Fulfulde', nativeName: 'Fulfulde', code: 'ffm' },
  { name: 'Nigerian Fulfulde', nativeName: 'Fulfulde', code: 'fuv' },
  { name: 'Western Niger Fulfulde', nativeName: 'Fulfulde', code: 'fuh' },
  { name: 'Adlam', nativeName: 'Adlam', code: 'adl' },
  { name: 'Wolof', nativeName: 'Wolof', code: 'wo' },
  { name: 'Lebu', nativeName: 'Wolof', code: 'lbq' },
  { name: 'Serer', nativeName: 'Seereer', code: 'srr' },
  { name: 'None', nativeName: 'Noon', code: 'snf' },
  { name: 'Lehar', nativeName: 'Laalaa', code: 'cae' },
  { name: 'Palor', nativeName: 'Sili', code: 'fap' },
  { name: 'Ndut', nativeName: 'Ndut', code: 'ndv' },
  { name: 'Safi', nativeName: 'Saafi-Saafi', code: 'sav' },
  { name: 'Diola', nativeName: 'Jola', code: 'dyo' },
  { name: 'Fogny', nativeName: 'Fogny', code: 'dyf' },
  { name: 'Kasa', nativeName: 'Kasa', code: 'csk' },
  { name: 'Bliss', nativeName: 'Bliss', code: 'blq' },
  { name: 'Carabin', nativeName: 'Carabin', code: 'caq' },
  { name: 'Ering', nativeName: 'Ering', code: 'erq' },
  { name: 'Keerak', nativeName: 'Keerak', code: 'keq' },
  { name: 'Lulu', nativeName: 'Lulu', code: 'luq' },
  { name: 'Bayot', nativeName: 'Bayot', code: 'bgo' },
  { name: 'Karon', nativeName: 'Karon', code: 'krx' },
  { name: 'Mlomp', nativeName: 'Mlomp', code: 'mlo' },
  { name: 'Bandial', nativeName: 'Bandial', code: 'bqj' },
  { name: 'Gusilay', nativeName: 'Gusilay', code: 'gsl' },
  { name: 'Kwatay', nativeName: 'Kwatay', code: 'khw' },
  { name: 'Sanhaja', nativeName: 'Sanhaja', code: 'saq' },
  { name: 'Zenata', nativeName: 'Zenata', code: 'zeq' },
  { name: 'Masmuda', nativeName: 'Masmuda', code: 'maq' },
  { name: 'Ghomara', nativeName: 'Ghomara', code: 'gho' },
  { name: 'Senhaja de Srair', nativeName: 'Senhaja', code: 'sjs' },
  { name: 'Judaeo-Berber', nativeName: 'Berber', code: 'jbe' },
  { name: 'Guanche', nativeName: 'Guanche', code: 'gnc' },
  { name: 'Coptic', nativeName: 'ⲙⲉⲩⲣⲉⲙⲛ̀ⲭⲏⲙⲓ', code: 'cop' },
  { name: 'Old Egyptian', nativeName: 'Egyptian', code: 'egy' },
  { name: 'Demotic', nativeName: 'Demotic', code: 'deq' },
  { name: 'Hieroglyphic', nativeName: 'Hieroglyphs', code: 'hiq' },
  { name: 'Geez', nativeName: 'ግዕዝ', code: 'gez' },
  { name: 'Tigray', nativeName: 'ትግሬ', code: 'tgq' },
  { name: 'Beni Amer', nativeName: 'Beni Amer', code: 'baq' },
  { name: 'Mensa', nativeName: 'Mensa', code: 'meq' },
  { name: 'Maria', nativeName: 'Maria', code: 'maq' },
  { name: 'Habab', nativeName: 'Habab', code: 'haq' },
  { name: 'Ad Tekles', nativeName: 'Ad Tekles', code: 'atq' },
  { name: 'Ad Temariam', nativeName: 'Ad Temariam', code: 'atq' },
  { name: 'Ad Sheikh', nativeName: 'Ad Sheikh', code: 'asq' },
  { name: 'Ad Moallim', nativeName: 'Ad Moallim', code: 'amq' },
  { name: 'Beit Juk', nativeName: 'Beit Juk', code: 'bjq' },
  { name: 'Beit Mala', nativeName: 'Beit Mala', code: 'bmq' },
  { name: 'Beit Shakan', nativeName: 'Beit Shakan', code: 'bsq' },
  { name: 'Beit Asgede', nativeName: 'Beit Asgede', code: 'baq' },
  { name: 'Sabderat', nativeName: 'Sabderat', code: 'saq' },
  { name: 'Diglel', nativeName: 'Diglel', code: 'diq' },
  { name: 'Hadal', nativeName: 'Hadal', code: 'haq' },
  { name: 'Kandake', nativeName: 'Kandake', code: 'kaq' },
  { name: 'Meroitic', nativeName: 'Meroitic', code: 'xmr' },
  { name: 'Aramaean', nativeName: 'ܐܪܡܝܐ', code: 'arc' },
  { name: 'Syriac', nativeName: 'ܠܫܢܐ ܣܘܪܝܝܐ', code: 'syc' },
  { name: 'Chaldean', nativeName: 'ܟܠܕܝܐ', code: 'cld' },
  { name: 'Assyrian', nativeName: 'ܐܫܘܪܝܐ', code: 'aii' },
  { name: 'Mandaic', nativeName: 'Mandaic', code: 'mid' },
  { name: 'Samaritan', nativeName: 'Samaritan', code: 'sam' },
  { name: 'Phoenician', nativeName: 'Phoenician', code: 'phn' },
  { nativeName: 'Punic', name: 'Punic', code: 'xpu' },
  { nativeName: 'Moabite', name: 'Moabite', code: 'obm' },
  { nativeName: 'Ammonite', name: 'Ammonite', code: 'oam' },
  { nativeName: 'Edomite', name: 'Edomite', code: 'oed' },
  { nativeName: 'Ugaritic', name: 'Ugaritic', code: 'uga' },
  { nativeName: 'Eblaite', name: 'Eblaite', code: 'xeb' },
  { nativeName: 'Amorite', name: 'Amorite', code: 'xmr' },
  { nativeName: 'Akkadian', name: 'Akkadian', code: 'akk' },
  { nativeName: 'Babylonian', name: 'Babylonian', code: 'baq' },
  { nativeName: 'Assyrian', name: 'Assyrian', code: 'asq' },
  { nativeName: 'Sumerian', name: 'Sumerian', code: 'sux' },
  { nativeName: 'Elamite', name: 'Elamite', code: 'elx' },
  { nativeName: 'Hurrian', name: 'Hurrian', code: 'xhu' },
  { nativeName: 'Urartian', name: 'Urartian', code: 'xur' },
  { nativeName: 'Hittite', name: 'Hittite', code: 'hit' },
  { nativeName: 'Luwian', name: 'Luwian', code: 'hlu' },
  { nativeName: 'Lycian', name: 'Lycian', code: 'xlc' },
  { nativeName: 'Lydian', name: 'Lydian', code: 'xld' },
  { nativeName: 'Palaic', name: 'Palaic', code: 'plq' },
  { nativeName: 'Phrygian', name: 'Phrygian', code: 'xpg' },
  { nativeName: 'Thracian', name: 'Thracian', code: 'xth' },
  { nativeName: 'Dacian', name: 'Dacian', code: 'xdc' },
  { nativeName: 'Illyrian', name: 'Illyrian', code: 'xil' },
  { nativeName: 'Messapic', name: 'Messapic', code: 'xme' },
  { nativeName: 'Venetic', name: 'Venetic', code: 'xve' },
  { nativeName: 'Etruscan', name: 'Etruscan', code: 'ett' },
  { nativeName: 'Raetic', name: 'Raetic', code: 'xrr' },
  { nativeName: 'Lemnian', name: 'Lemnian', code: 'xle' },
  { nativeName: 'Camunic', name: 'Camunic', code: 'xca' },
  { nativeName: 'Sicanian', name: 'Sicanian', code: 'xsi' },
  { nativeName: 'Sicel', name: 'Sicel', code: 'xsc' },
  { nativeName: 'Elymian', name: 'Elymian', code: 'xly' },
  { nativeName: 'North Picene', name: 'North Picene', code: 'xnp' },
  { nativeName: 'South Picene', name: 'South Picene', code: 'xsp' },
  { nativeName: 'Umbrian', name: 'Umbrian', code: 'xum' },
  { nativeName: 'Oscan', name: 'Oscan', code: 'xos' },
  { nativeName: 'Sabine', name: 'Sabine', code: 'xsa' },
  { nativeName: 'Faliscan', name: 'Faliscan', code: 'xfa' },
  { nativeName: 'Latin', name: 'Latin', code: 'la' },
  { nativeName: 'Vulgar Latin', name: 'Vulgar Latin', code: 'vlq' },
  { nativeName: 'Archaic Latin', name: 'Archaic Latin', code: 'itc' },
  { nativeName: 'Old French', name: 'Old French', code: 'fro' },
  { nativeName: 'Old Occitan', name: 'Old Occitan', code: 'pro' },
  { nativeName: 'Old Spanish', name: 'Old Spanish', code: 'osp' },
  { nativeName: 'Old Portuguese', name: 'Old Portuguese', code: 'opt' },
  { nativeName: 'Old Italian', name: 'Old Italian', code: 'oit' },
  { nativeName: 'Old High German', name: 'Old High German', code: 'goh' },
  { nativeName: 'Old Saxon', name: 'Old Saxon', code: 'osx' },
  { nativeName: 'Old Dutch', name: 'Old Dutch', code: 'odt' },
  { nativeName: 'Old English', name: 'Old English', code: 'ang' },
  { nativeName: 'Old Norse', name: 'Old Norse', code: 'non' },
  { nativeName: 'Gothic', name: 'Gothic', code: 'got' },
  { nativeName: 'Vandal', name: 'Vandalic', code: 'xvn' },
  { nativeName: 'Burgundian', name: 'Burgundian', code: 'xby' },
  { nativeName: 'Lombard', name: 'Lombardic', code: 'lng' },
  { nativeName: 'Frankish', name: 'Frankish', code: 'frk' },
  { nativeName: 'Gaulish', name: 'Gaulish', code: 'xtg' },
  { nativeName: 'Lepontic', name: 'Lepontic', code: 'xlp' },
  { nativeName: 'Galatian', name: 'Galatian', code: 'xga' },
  { nativeName: 'Celtiberian', name: 'Celtiberian', code: 'xce' },
  { nativeName: 'Lusitanian', name: 'Lusitanian', code: 'xls' },
  { nativeName: 'Pictish', name: 'Pictish', code: 'xpi' },
  { nativeName: 'Old Irish', name: 'Old Irish', code: 'sga' },
  { nativeName: 'Middle Irish', name: 'Middle Irish', code: 'mga' },
  { nativeName: 'Old Welsh', name: 'Old Welsh', code: 'owl' },
  { nativeName: 'Old Breton', name: 'Old Breton', code: 'obt' },
  { nativeName: 'Old Cornish', name: 'Old Cornish', code: 'oco' },
  { nativeName: 'Cumbric', name: 'Cumbric', code: 'xcb' },
  { nativeName: 'Ivernic', name: 'Ivernic', code: 'xiv' },
  { nativeName: 'Tartessian', name: 'Tartessian', code: 'txr' },
  { nativeName: 'Iberian', name: 'Iberian', code: 'xib' },
  { nativeName: 'Paleohispanic', name: 'Paleohispanic', code: 'phs' },
  { nativeName: 'Aquitanian', name: 'Aquitanian', code: 'xaq' },
  { nativeName: 'Basque', name: 'Euskara', code: 'eu' },
  { nativeName: 'Proto-Indo-European', name: 'Proto-Indo-European', code: 'ine' },
  { nativeName: 'Sanskrit', name: 'संस्कृतम्', code: 'sa' },
  { nativeName: 'Pali', name: 'पालि', code: 'pi' },
  { nativeName: 'Prakrit', name: 'Prākrit', code: 'pra' },
  { nativeName: 'Avestan', name: 'Avestan', code: 'ae' },
  { nativeName: 'Old Persian', name: 'Old Persian', code: 'peo' },
  { nativeName: 'Middle Persian', name: 'Middle Persian', code: 'pal' },
  { nativeName: 'Sogdian', name: 'Sogdian', code: 'sog' },
  { nativeName: 'Bactrian', name: 'Bactrian', code: 'xbc' },
  { nativeName: 'Khotanese', name: 'Khotanese', code: 'kho' },
  { nativeName: 'Tocharian A', name: 'Tocharian A', code: 'xto' },
  { nativeName: 'Tocharian B', name: 'Tocharian B', code: 'txb' },
  { nativeName: 'Tangut', name: 'Tangut', code: 'txg' },
  { nativeName: 'Khitan', name: 'Khitan', code: 'zkt' },
  { nativeName: 'Jurchen', name: 'Jurchen', code: 'juc' },
  { nativeName: 'Manchu', name: 'Manchu', code: 'mnc' },
  { nativeName: 'Ainu', name: 'Ainu', code: 'ain' },
  { nativeName: 'Eskimo', name: 'Inuit', code: 'iu' },
  { nativeName: 'Yupik', name: 'Yupik', code: 'ypk' },
  { nativeName: 'Aleut', name: 'Aleut', code: 'ale' },
  { nativeName: 'Tlingit', name: 'Tlingit', code: 'tli' },
  { nativeName: 'Haida', name: 'Haida', code: 'hai' },
  { nativeName: 'Athabaskan', name: 'Athabaskan', code: 'ath' },
  { nativeName: 'Navajo', name: 'Diné', code: 'nv' },
  { nativeName: 'Apache', name: 'Apache', code: 'apa' },
  { nativeName: 'Cherokee', name: 'ᏣᎳᎩ', code: 'chr' },
  { nativeName: 'Mohawk', name: 'Kanien\'kéha', code: 'moh' },
  { nativeName: 'Ojibwe', name: 'Anishinaabe', code: 'oj' },
  { nativeName: 'Cree', name: 'Nēhiyawēwin', code: 'cr' },
  { nativeName: 'Dakota', name: 'Dakota', code: 'dak' },
  { nativeName: 'Lakota', name: 'Lakȟóta', code: 'lkt' },
  { nativeName: 'Sioux', name: 'Sioux', code: 'siq' },
  { nativeName: 'Pawnee', name: 'Pawnee', code: 'pwn' },
  { nativeName: 'Cheyenne', name: 'Tsėhesenėstsestotse', code: 'chy' },
  { nativeName: 'Arapaho', name: 'Hinóno\'eitíít', code: 'arp' },
  { nativeName: 'Blackfoot', name: 'Siksiká', code: 'bla' },
  { nativeName: 'Comanche', name: 'Nʉmʉ Tekwapʉ', code: 'com' },
  { nativeName: 'Shoshone', name: 'Shoshoni', code: 'shh' },
  { nativeName: 'Ute', name: 'Ute', code: 'ute' },
  { nativeName: 'Hopi', name: 'Hopi', code: 'hop' },
  { nativeName: 'Zuni', name: 'Zuni', code: 'zun' },
  { nativeName: 'Pima', name: 'O\'odham', code: 'ood' },
  { nativeName: 'Mayo', name: 'Mayo', code: 'mfy' },
  { nativeName: 'Yaqui', name: 'Yoeme', code: 'yaq' },
  { nativeName: 'Rarámuri', name: 'Tarahumara', code: 'tar' },
  { nativeName: 'Nāhuatl', name: 'Nahuatl', code: 'nah' },
  { nativeName: 'Maya', name: 'Mayan', code: 'myn' },
  { nativeName: 'K\'iche\'', name: 'Quiche', code: 'quc' },
  { nativeName: 'Q\'eqchi\'', name: 'Kekchi', code: 'kek' },
  { nativeName: 'Mam', name: 'Mam', code: 'mam' },
  { nativeName: 'Kaqchikel', name: 'Cakchiquel', code: 'cak' },
  { nativeName: 'Tu\'un Savi', name: 'Mixtec', code: 'mix' },
  { nativeName: 'Diidxazá', name: 'Zapotec', code: 'zap' },
  { nativeName: 'Hñähñu', name: 'Otomi', code: 'ots' },
  { nativeName: 'Mazahua', name: 'Mazahua', code: 'maz' },
  { nativeName: 'Totonac', name: 'Totonac', code: 'tot' },
  { nativeName: 'P\'urhépecha', name: 'Purepecha', code: 'pua' },
  { nativeName: 'Tének', name: 'Huastec', code: 'hus' },
  { nativeName: 'Chinantec', name: 'Chinantec', code: 'chq' },
  { nativeName: 'Enna', name: 'Mazatec', code: 'mau' },
];

const FAQS = [
  {
    category: 'general',
    question: "¿Cómo creo un nuevo evento? / How do I create a new event?",
    answer: "Puedes crear un evento tocando el icono '+' en la esquina superior derecha del Calendario de Eventos, o haciendo clic en el botón 'Añadir Evento'. / You can create an event by tapping the '+' icon in the Event Calendar top right corner, or by clicking the 'Add Event' button!"
  },
  {
    category: 'account',
    question: "¿Puedo subir una foto de portada para mi evento? / Can I upload an event cover?",
    answer: "¡Sí! Al crear o editar un evento, verás una sección de 'Imagen de portada' donde puedes subir una foto hermosa. / Yes! When creating or editing an event, you'll see a 'Cover Image' section where you can upload a photo."
  },
  {
    category: 'general',
    question: "¿Qué categorías de eventos hay? / What event categories are available?",
    answer: "Admitimos las categorías de Cumpleaños, Entretenimiento, Catering, Reunión, Música, Fiesta de casa, Tour, Deportes, Evento escolar y Seminario web. / We support Birthday, Entertainment, Catering, Meeting, Music, House Party, Tour, Sports, School Event, and Webinar categories."
  },
  {
    category: 'safety',
    question: "¿Hay límite de eventos creados? / Is there a limit on events?",
    answer: "Actualmente, puedes crear hasta 100 eventos en tu calendario personal. Los eventos se guardan localmente en tu dispositivo. / Currently, you can create up to 100 events in your personal calendar. Events are stored locally on your device."
  },
  {
    category: 'privacy',
    question: "¿Cómo comparto un evento con amigos? / How can I share an event?",
    answer: "Cada evento tiene un icono de 'Compartir'. Al tocarlo se abrirá el menú nativo para compartir de tu dispositivo o copiará un enlace al portapapeles. / Each event has a 'Share' icon. Tapping it will open your device's native share menu or copy a link to your clipboard."
  }
];

export default function LanguagesPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'languages' | 'faq'>('languages');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(() => localStorage.getItem('imchat_language') || 'en');
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);
  const [activeFAQCategory, setActiveFAQCategory] = useState<'all' | 'general' | 'account' | 'privacy'>('all');

  const filteredLanguages = LANGUAGES.filter(lang => 
    lang.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaqs = FAQS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeFAQCategory === 'all' || faq.category === activeFAQCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-white text-gray-900"
    >
      <header className="bg-white p-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <div className="flex flex-col">
          <h1 className="font-bold text-lg tracking-tight">
            {activeTab === 'languages' ? 'Idiomas / Languages' : 'Ayuda / Help Center'}
          </h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            {activeTab === 'languages' 
              ? `${LANGUAGES.length} Languages Available` 
              : 'Preguntas Frecuentes & FAQ'}
          </p>
        </div>
        <div className="flex-1"></div>
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-brand-blue overflow-hidden">
          {activeTab === 'languages' ? (
            <LanguagesIcon className="w-7 h-7" />
          ) : (
            <HelpCircle className="w-6 h-6 text-brand-blue" />
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-white sticky top-[69px] z-10 shadow-sm">
        <button
          onClick={() => {
            setActiveTab('languages');
            setSearchQuery('');
          }}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-[3px] transition-all duration-200 ${
            activeTab === 'languages'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Idiomas / Languages
        </button>
        <button
          onClick={() => {
            setActiveTab('faq');
            setSearchQuery('');
          }}
          className={`flex-1 py-3.5 text-xs font-bold uppercase tracking-wider text-center border-b-[3px] transition-all duration-200 ${
            activeTab === 'faq'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          Preguntas Frecuentes / FAQ
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 bg-gray-50/50 border-b border-gray-100">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
          <input 
            type="text" 
            placeholder={activeTab === 'languages' ? "Search 500+ languages..." : "Buscar preguntas frecuentes / Search FAQs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-brand-blue focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'languages' ? (
          <div className="p-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredLanguages.length > 0 ? (
                filteredLanguages.map((lang, index) => (
                  <motion.button
                    key={lang.code + index}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(index * 0.005, 0.15) }}
                    onClick={() => setSelectedLanguage(lang.code)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      selectedLanguage === lang.code 
                        ? 'bg-blue-50 border-brand-blue/30 shadow-sm' 
                        : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        selectedLanguage === lang.code ? 'bg-brand-blue text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {lang.code.toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold text-[15px] ${selectedLanguage === lang.code ? 'text-brand-blue' : 'text-gray-900'}`}>
                          {lang.name}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">{lang.nativeName}</span>
                      </div>
                    </div>
                    {selectedLanguage === lang.code && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 bg-brand-blue rounded-full flex items-center justify-center text-white shadow-md shadow-blue-100"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3px]" />
                      </motion.div>
                    )}
                  </motion.button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 overflow-hidden">
                    <LanguagesIcon className="w-10 h-10 opacity-20" />
                  </div>
                  <p className="font-bold text-sm">No matches found</p>
                  <p className="text-xs">Try searching for a different language</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* FAQ Filter buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'all', label: 'Todos / All', icon: HelpCircle },
                { id: 'general', label: 'Eventos', icon: Users },
                { id: 'privacy', label: 'Privacidad', icon: Shield },
                { id: 'account', label: 'Portada', icon: Bell }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveFAQCategory(cat.id as any);
                    setOpenFAQIndex(null);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    activeFAQCategory === cat.id 
                      ? 'bg-brand-blue text-white shadow-md shadow-blue-100' 
                      : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, idx) => (
                    <motion.div 
                      key={idx} 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      <button 
                        onClick={() => setOpenFAQIndex(openFAQIndex === idx ? null : idx)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left gap-3"
                      >
                        <span className="font-bold text-gray-800 text-[14px] leading-snug">{faq.question}</span>
                        {openFAQIndex === idx ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      </button>
                      
                      <AnimatePresence>
                        {openFAQIndex === idx && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-5 pb-5 text-[13px] text-gray-500 leading-relaxed border-t border-gray-50 pt-3"
                          >
                            {faq.answer}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <p className="font-bold text-sm">No se encontraron preguntas / No FAQs found</p>
                    <p className="text-xs">Prueba con otra palabra clave / Try another search word</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Support section card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100/30">
              <h4 className="font-bold text-brand-blue text-sm mb-1">¿Necesitas soporte técnico? / Need further help?</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Nuestro centro de ayuda está disponible para ayudarte las 24 horas. También puedes contactar al soporte del sistema desde tu menú de chat principal.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer message changes contextualized by tab */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Info className="w-4 h-4" />
        </div>
        <p className="text-[11px] text-gray-500 font-medium leading-tight">
          {activeTab === 'languages' 
            ? "Changing the language will update the UI and system messages. Some user content may still appear in its original language."
            : "Este centro de documentación se actualiza dinámicamente según las normativas y novedades de la comunidad IMChat."}
        </p>
      </div>
    </motion.div>
  );
}
