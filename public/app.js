'use strict';

/* ==========================================================================
   Sims Hub — client. One in-memory state object per profile is the source of
   truth during a session; the server is persistence. Writes are debounced and
   always send the whole blob.
   ========================================================================== */

/* The app may be served from a sub-path, so the API prefix is derived at
   runtime instead of hard-coding /api/… */
const BASE = (() => {
  const path = window.location.pathname;
  if (path.endsWith('/')) return path.slice(0, -1);
  return path.replace(/\/[^/]*$/, '');
})();

const SCHEMA_VERSION = 1;
const SAVE_DEBOUNCE_MS = 1000;
const POLL_INTERVAL_MS = 30000;
const HISTORY_LIMIT = 50;
/* ----------------------------------------------------------- localization */

const I18N = {
  ru: {
    app_title: 'Sims Hub',
    tab_simsmix: 'Генератор',
    tab_supersim: 'Суперсим',
    tab_randompacks: 'Случайные наборы',
    tab_wheel: 'Колесо',
    tab_random: 'Число',
    tab_packs: 'Наборы',
    tab_simgen: 'Сим',
    saved: 'Сохранено',
    saving: 'Сохранение…',
    error: 'Ошибка сохранения',
    offline: 'Офлайн – сохраню позже',
    conflict: 'Профиль был изменен на другом устройстве.',
    reload: 'Перезагрузить',
    retry: 'Повторить',
    simsmix_gen_all: '🎲 Сгенерировать всё',
    simsmix_copy_all: '📋 Скопировать персонажа',
    simsmix_reset_all: 'Сбросить',
    simsmix_gender_title: 'Пол',
    simsmix_opt_random: 'Случайно',
    simsmix_opt_male: 'Мальчик',
    simsmix_opt_female: 'Девочка',
    simsmix_gender_result: 'Результат:',
    simsmix_gen_gender: '🎲 Сгенерировать пол',
    simsmix_values_title: 'Достоинства характера',
    simsmix_values_hint: 'Набор достоинств из игрового набора «Родительство».',
    simsmix_gen_values: '🎲 Сгенерировать достоинства',
    simsmix_val_pos: 'Положительное (+)',
    simsmix_val_neg: 'Отрицательное (−)',
    simsmix_val_neu: 'Нейтрально (без черты)',
    simsmix_val_rnd: 'Случайно (?)',
    simsmix_aspirations_title: 'Жизненные цели',
    simsmix_gen_aspirations: '🎲 Сгенерировать цели',
    stage_infant: 'Младенец',
    stage_toddler: 'Малыш',
    stage_child: 'Детство',
    stage_teen: 'Подросток',
    stage_adult: 'Взрослая жизнь',
    simsmix_careers_title: 'Карьера',
    simsmix_career_teen_label: 'Подростковая подработка',
    simsmix_career_adult_label: 'Взрослая карьера',
    simsmix_include_branches: 'Включая специализацию',
    simsmix_gen_careers: '🎲 Сгенерировать карьеру',
    simsmix_traits_title: 'Черты характера',
    simsmix_trait_child_label: '1-я черта (Детство)',
    simsmix_trait_teen_label: '2-я черта (Подросток)',
    simsmix_trait_adult_label: '3-я черта (Взрослый)',
    simsmix_gen_traits: '🎲 Сгенерировать черты',
    simsmix_heredity_title: 'Наследование от родителей',
    simsmix_heredity_enable: 'Учитывать черты родителей',
    simsmix_heredity_hint: 'Черты родителей получают повышенный шанс выпадения при взрослении ребенка.',
    simsmix_father_title: 'Черты отца',
    simsmix_mother_title: 'Черты матери',
    simsmix_no_trait: '— Без черты —',
    rp_title: 'Случайный выбор наборов (Random Packs)',
    rp_subtitle: 'Генератор случайных DLC в стиле James Turner с весами категорий и фильтром по имеющимся дополнениям.',
    rp_count_label: 'Количество наборов (1–20)',
    rp_each_cat: 'Гарантировать хотя бы один из каждой активной категории',
    rp_weights_title: 'Веса категорий',
    rp_roll_btn: '🎲 Выбрать наборы',
    rp_copy_btn: '📋 Скопировать',
    rp_installed_title: 'Используемые наборы',
    rp_installed_hint: 'Отметьте наборы, которые будут участвовать в жеребьевке. Настройки сохраняются в профиле.',
    rp_select_all: 'Выбрать все',
    rp_deselect_all: 'Снять все',
    rp_search_placeholder: 'Поиск набора…',
    supersim_summary_title: 'Общий прогресс',
    supersim_search_placeholder: 'Поиск задачи…',
    age_all: 'Все возрасты',
    supersim_hide_done: 'Скрыть выполненные',
    supersim_reset_all: 'Сбросить всё',
    supersim_reset_section: 'Сбросить',
    supersim_hint: 'Клик: +1 уровень. Правый клик или долгое нажатие: −1 уровень.',
    rnd_title_settings: 'Настройки',
    rnd_title_result: 'Результат',
    rnd_title_history: 'История',
    rnd_from: 'От',
    rnd_to: 'До',
    rnd_count: 'Количество чисел (1–100)',
    rnd_unique: 'Без повторений',
    rnd_sort: 'Сортировать',
    rnd_go: 'Сгенерировать',
    rnd_copy: 'Копировать',
    rnd_clear_history: 'Очистить историю',
    rnd_hint: 'Нажмите на число, чтобы скопировать его',
    rnd_empty: 'Пока пусто.',
    rnd_err_bounds: 'Введите корректные целые числа «От» и «До».',
    rnd_err_min_gt_max: 'Значение «От» должно быть меньше или равно «До».',
    rnd_err_count: 'Количество чисел должно быть от 1 до 100.',
    rnd_err_span: 'Диапазон слишком велик.',
    rnd_err_unique: 'Без повторений нельзя выбрать столько чисел из заданного диапазона.',
    category_expansion: 'Дополнения',
    category_gamepack: 'Игровые наборы',
    category_stuffpack: 'Каталоги',
    category_kit: 'Комплекты',
    copied_toast: 'Скопировано в буфер обмена.',
    copy_failed_toast: 'Не удалось скопировать.',
    lock: 'Заблокировать',
    unlock: 'Разблокировать',
    dialog_cancel: 'Отмена',
    dialog_ok: 'OK',
    rp_msg_no_active: 'Нет активных наборов. Отметьте хотя бы один набор с ненулевым весом категории.',
    rp_msg_only_n_available: 'Доступно только {n} наборов, отображаются все.',
    rnd_preset_coin: '🪙 Монета (1–2)',
    rnd_preset_d6: '🎲 Кубик d6',
    rnd_preset_2d6: '🎲 2d6',
    rnd_preset_d20: '🎯 d20',
    rnd_preset_100: '💯 1–100',
    rnd_preset_sim: '👨‍👩‍👧‍👦 Сим (1–8)',
    rnd_stats_sum: 'Сумма',
    rnd_stats_avg: 'Среднее',
    rnd_stats_min: 'Мин',
    rnd_stats_max: 'Макс',
    rnd_nothing_to_copy: 'Нечего копировать.',
    wheel_items_title: 'Элементы',
    wheel_item_one: 'элемент',
    wheel_item_few: 'элемента',
    wheel_item_many: 'элементов',
    wheel_weight_one: 'вес',
    wheel_weight_few: 'веса',
    wheel_weight_many: 'весов',
    wheel_one_per_line: 'Один элемент на строку',
    wheel_placeholder: 'Пицца\nСуши\nБлинчики x3',
    wheel_hint_weight: 'Строка с окончанием x3 получает утроенный сектор.',
    wheel_shuffle: '🔀 Перемешать',
    wheel_shuffle_title: 'Случайно перемешать порядок элементов',
    wheel_sort: '🔤 Сортировать',
    wheel_sort_title: 'Отсортировать элементы по алфавиту',
    wheel_clear: 'Очистить',
    wheel_clear_title: 'Очистить весь список',
    wheel_remove_winner: 'Удалять победителя после вращения',
    wheel_sound: 'Звук',
    wheel_presets_title: 'Шаблоны и сохраненные списки',
    wheel_select_preset: '— Выбрать шаблон —',
    wheel_preset_challenges: 'Челленджи The Sims 4',
    wheel_preset_aspirations: 'Случайные цели The Sims 4',
    wheel_preset_food: 'Что сегодня приготовить',
    wheel_preset_activities: 'Чем заняться',
    wheel_preset_yes_no: 'Да / Нет / Возможно',
    wheel_preset_who_turn: 'Чья очередь',
    wheel_preset_load: 'Вставить',
    wheel_list_load: 'Загрузить',
    wheel_list_delete: 'Удалить',
    wheel_list_save: 'Сохранить текущий список',
    wheel_spin: 'Крутить',
    wheel_history_title: 'История',
    wheel_history_clear: 'Очистить историю',
    wheel_empty: 'Добавьте элементы',
    wheel_winner_badge: '🎉 Победитель',
    wheel_winner_title: 'Колесо фортуны',
    wheel_winner_ok: 'Отлично!',
    wheel_msg_add_first: 'Сначала добавьте хотя бы один элемент.',
    wheel_no_saved_lists: 'Нет сохраненных списков',
    wheel_shuffled_toast: 'Список случайно перемешан.',
    wheel_sorted_toast: 'Список отсортирован по алфавиту.',
    wheel_cleared_toast: 'Список очищен.',
    wheel_clear_confirm_title: 'Очистить список',
    wheel_clear_confirm_msg: 'Вы уверены, что хотите удалить все элементы с колеса?',
    wheel_preset_confirm_title: 'Вставить шаблон',
    wheel_preset_confirm_msg: 'Текущий список на колесе будет заменен этим шаблоном. Продолжить?',
    wheel_preset_loaded_toast: 'Шаблон загружен на колесо.',
    wheel_save_title: 'Сохранить список',
    wheel_save_prompt: 'Название списка',
    wheel_save_overwrite_title: 'Перезаписать список',
    wheel_save_overwrite_msg: 'Список «{name}» уже существует. Перезаписать?',
    wheel_saved_toast: 'Список сохранен.',
    wheel_delete_confirm_title: 'Удалить список',
    wheel_delete_confirm_msg: 'Действительно удалить список «{name}»?',
    wheel_deleted_toast: 'Список удален.',
    profile_manage: 'Управление профилями',
    profile_new: 'Новый профиль',
    profile_name_prompt: 'Название профиля',
    profile_create_btn: 'Создать',
    profile_created_toast: 'Профиль «{name}» готов.',
    profile_rename: 'Переименовать',
    profile_new_name: 'Новое название',
    profile_rename_btn: 'Переименовать',
    profile_renamed_toast: 'Профиль переименован.',
    profile_export: 'Экспорт JSON',
    profile_import: 'Импорт JSON',
    profile_import_title: 'Импорт профиля',
    profile_import_prompt: 'Название нового профиля',
    profile_import_btn: 'Импортировать',
    profile_imported_toast: 'Профиль импортирован.',
    profile_import_error: 'Не удалось прочитать файл как JSON.',
    profile_delete: 'Удалить профиль',
    profile_delete_title: 'Удалить профиль',
    profile_delete_confirm: 'Действительно удалить профиль «{name}» со всеми данными?',
    profile_delete_btn: 'Удалить',
    profile_deleted_toast: 'Профиль удален.',
    profile_close: 'Закрыть',
    footer_disclaimer: 'Неофициальный фанатский инструмент для The Sims 4. Не связан с EA или Maxis.',
  },
  cs: {
    app_title: 'Sims Hub',
    tab_simsmix: 'Generátor',
    tab_supersim: 'Super Sim',
    tab_randompacks: 'Náhodné balíčky',
    tab_wheel: 'Kolo',
    tab_random: 'Číslo',
    tab_packs: 'Packy',
    tab_simgen: 'Simík',
    saved: 'Uloženo',
    saving: 'Ukládám…',
    error: 'Nepodařilo se uložit',
    offline: 'Offline – uložím později',
    conflict: 'Profil mezitím někdo změnil na jiném zařízení.',
    reload: 'Načíst znovu',
    retry: 'Zkusit znovu',
    simsmix_gen_all: '🎲 Generovat vše',
    simsmix_copy_all: '📋 Kopírovat Simíka',
    simsmix_reset_all: 'Vynulovat',
    simsmix_gender_title: 'Pohlaví',
    simsmix_opt_random: 'Náhodné',
    simsmix_opt_male: 'Chlapec',
    simsmix_opt_female: 'Dívka',
    simsmix_gender_result: 'Výsledek:',
    simsmix_gen_gender: '🎲 Generovat pohlaví',
    simsmix_values_title: 'Vlastnosti výchovy',
    simsmix_values_hint: 'Výchovné hodnoty z herního balíčku Rodičovství.',
    simsmix_gen_values: '🎲 Generovat hodnoty',
    simsmix_val_pos: 'Kladná (+)',
    simsmix_val_neg: 'Záporná (−)',
    simsmix_val_neu: 'Neutrální (bez)',
    simsmix_val_rnd: 'Náhodně (?)',
    simsmix_aspirations_title: 'Aspirace',
    simsmix_gen_aspirations: '🎲 Generovat aspirace',
    stage_infant: 'Kojenec',
    stage_toddler: 'Batole',
    stage_child: 'Dětství',
    stage_teen: 'Teenager',
    stage_adult: 'Dospělost',
    simsmix_careers_title: 'Kariéra',
    simsmix_career_teen_label: 'Brigáda teenagera',
    simsmix_career_adult_label: 'Kariéra dospělého',
    simsmix_include_branches: 'Včetně specializace',
    simsmix_gen_careers: '🎲 Generovat kariéru',
    simsmix_traits_title: 'Vlastnosti',
    simsmix_trait_child_label: '1. vlastnost (Dítě)',
    simsmix_trait_teen_label: '2. vlastnost (Teen)',
    simsmix_trait_adult_label: '3. vlastnost (Dospělý)',
    simsmix_gen_traits: '🎲 Generovat vlastnosti',
    simsmix_heredity_title: 'Dědičnost po rodičích',
    simsmix_heredity_enable: 'Zohlednit vlastnosti rodičů',
    simsmix_heredity_hint: 'Vlastnosti rodičů mají vyšší šanci na zdědění při dospívání dítěte.',
    simsmix_father_title: 'Vlastnosti otce',
    simsmix_mother_title: 'Vlastnosti matky',
    simsmix_no_trait: '— Bez vlastnosti —',
    rp_title: 'Náhodný výběr balíčků (Random Packs)',
    rp_subtitle: 'Generátor DLC ve stylu Jamese Turnera s váhami kategorií a filtrem podle vlastněných balíčků.',
    rp_count_label: 'Počet balíčků (1–20)',
    rp_each_cat: 'Alespoň jeden z každé aktivní kategorie',
    rp_weights_title: 'Váhy kategorií',
    rp_roll_btn: '🎲 Losovat balíčky',
    rp_copy_btn: '📋 Kopírovat',
    rp_installed_title: 'Používané balíčky',
    rp_installed_hint: 'Zaškrtni balíčky, které se mají účastnit losování. Nastavení se ukládá do profilu.',
    rp_select_all: 'Vybrat vše',
    rp_deselect_all: 'Zrušit vše',
    rp_search_placeholder: 'Hledat balíček…',
    supersim_summary_title: 'Celkový postup',
    supersim_search_placeholder: 'Hledat položku…',
    age_all: 'Všechny věky',
    supersim_hide_done: 'Skrýt hotové',
    supersim_reset_all: 'Vynulovat vše',
    supersim_reset_section: 'Vynulovat',
    supersim_hint: 'Klik přidá úroveň, pravý klik nebo dlouhé podržení ji ubere.',
    rnd_title_settings: 'Nastavení',
    rnd_title_result: 'Výsledek',
    rnd_title_history: 'Historie',
    rnd_from: 'Od',
    rnd_to: 'Do',
    rnd_count: 'Počet čísel (1–100)',
    rnd_unique: 'Bez opakování',
    rnd_sort: 'Seřadit',
    rnd_go: 'Generovat',
    rnd_copy: 'Kopírovat',
    rnd_clear_history: 'Vymazat historii',
    rnd_hint: 'Kliknutím na číslo ho zkopíruješ',
    rnd_empty: 'Zatím nic.',
    rnd_err_bounds: 'Zadej platná celá čísla „Od“ i „Do“.',
    rnd_err_min_gt_max: 'Hodnota „Od“ musí být menší nebo rovna „Do“.',
    rnd_err_count: 'Počet čísel musí být 1 až 100.',
    rnd_err_span: 'Rozsah je příliš velký.',
    rnd_err_unique: 'Bez opakování nelze vylosovat tolik čísel z daného rozsahu.',
    category_expansion: 'Rozšíření',
    category_gamepack: 'Herní balíčky',
    category_stuffpack: 'Kolekce',
    category_kit: 'Výbava (Kity)',
    copied_toast: 'Zkopírováno do schránky.',
    copy_failed_toast: 'Kopírování se nepovedlo.',
    lock: 'Zamknout',
    unlock: 'Odemknout',
    dialog_cancel: 'Zrušit',
    dialog_ok: 'OK',
    rp_msg_no_active: 'Žádné aktivní balíčky. Zaškrtněte alespoň jeden balíček s nenulovou vahou kategorie.',
    rp_msg_only_n_available: 'K dispozici je pouze {n} balíčků, zobrazeny jsou všechny.',
    rnd_preset_coin: '🪙 Mince (1–2)',
    rnd_preset_d6: '🎲 Kostka d6',
    rnd_preset_2d6: '🎲 2d6',
    rnd_preset_d20: '🎯 d20',
    rnd_preset_100: '💯 1–100',
    rnd_preset_sim: '👨‍👩‍👧‍👦 Simík (1–8)',
    rnd_stats_sum: 'Součet',
    rnd_stats_avg: 'Průměr',
    rnd_stats_min: 'Min',
    rnd_stats_max: 'Max',
    rnd_nothing_to_copy: 'Není co kopírovat.',
    wheel_items_title: 'Položky',
    wheel_item_one: 'položka',
    wheel_item_few: 'položky',
    wheel_item_many: 'položek',
    wheel_weight_one: 'váha',
    wheel_weight_few: 'váhy',
    wheel_weight_many: 'vah',
    wheel_one_per_line: 'Jedna položka na řádek',
    wheel_placeholder: 'Pizza\nSushi\nPalačinky x3',
    wheel_hint_weight: 'Řádek zakončený x3 dostane trojnásobně velký segment.',
    wheel_shuffle: '🔀 Zamíchat',
    wheel_shuffle_title: 'Náhodně promíchat pořadí položek',
    wheel_sort: '🔤 Seřadit',
    wheel_sort_title: 'Seřadit položky podle abecedy',
    wheel_clear: 'Vyčistit',
    wheel_clear_title: 'Vymazat celý seznam',
    wheel_remove_winner: 'Odebrat vítěze po vytočení',
    wheel_sound: 'Zvuk',
    wheel_presets_title: 'Předlohy a uložené seznamy',
    wheel_select_preset: '— Vybrat předlohu —',
    wheel_preset_challenges: 'Sims 4 výzvy',
    wheel_preset_aspirations: 'Sims 4 náhodné cíle',
    wheel_preset_food: 'Co dnes k jídlu',
    wheel_preset_activities: 'Co dnes podniknout',
    wheel_preset_yes_no: 'Ano / Ne / Možná',
    wheel_preset_who_turn: 'Kdo je na řadě',
    wheel_preset_load: 'Vložit',
    wheel_list_load: 'Načíst',
    wheel_list_delete: 'Smazat',
    wheel_list_save: 'Uložit aktuální seznam',
    wheel_spin: 'Zatočit',
    wheel_history_title: 'Historie',
    wheel_history_clear: 'Vymazat historii',
    wheel_empty: 'Přidej položky',
    wheel_winner_badge: '🎉 Vítězná volba',
    wheel_winner_title: 'Kolo štěstí',
    wheel_winner_ok: 'Skvělé!',
    wheel_msg_add_first: 'Nejdřív přidej aspoň jednu položku.',
    wheel_no_saved_lists: 'Žádný uložený seznam',
    wheel_shuffled_toast: 'Seznam byl náhodně promíchán.',
    wheel_sorted_toast: 'Seznam byl seřazen podle abecedy.',
    wheel_cleared_toast: 'Seznam byl vyčištěn.',
    wheel_clear_confirm_title: 'Vyčistit seznam',
    wheel_clear_confirm_msg: 'Opravdu chceš smazat všechny položky z kola?',
    wheel_preset_confirm_title: 'Vložit předlohu',
    wheel_preset_confirm_msg: 'Aktuální seznam na kole bude nahrazen touto předlohou. Chceš pokračovat?',
    wheel_preset_loaded_toast: 'Předloha byla vložena na kolo.',
    wheel_save_title: 'Uložit seznam',
    wheel_save_prompt: 'Název seznamu',
    wheel_save_overwrite_title: 'Přepsat seznam',
    wheel_save_overwrite_msg: 'Seznam „{name}“ už existuje. Přepsat ho?',
    wheel_saved_toast: 'Seznam uložený.',
    wheel_delete_confirm_title: 'Smazat seznam',
    wheel_delete_confirm_msg: 'Opravdu smazat seznam „{name}“?',
    wheel_deleted_toast: 'Seznam smazaný.',
    profile_manage: 'Správa profilů',
    profile_new: 'Nový profil',
    profile_name_prompt: 'Název profilu',
    profile_create_btn: 'Vytvořit',
    profile_created_toast: 'Profil „{name}“ je připravený.',
    profile_rename: 'Přejmenovat',
    profile_new_name: 'Nový název',
    profile_rename_btn: 'Přejmenovat',
    profile_renamed_toast: 'Profil přejmenovaný.',
    profile_export: 'Exportovat JSON',
    profile_import: 'Importovat JSON',
    profile_import_title: 'Import profilu',
    profile_import_prompt: 'Název nového profilu',
    profile_import_btn: 'Importovat',
    profile_imported_toast: 'Profil naimportovaný.',
    profile_import_error: 'Soubor se nepodařilo načíst jako JSON.',
    profile_delete: 'Smazat profil',
    profile_delete_title: 'Smazat profil',
    profile_delete_confirm: 'Opravdu smazat profil „{name}“ i se všemi daty?',
    profile_delete_btn: 'Smazat',
    profile_deleted_toast: 'Profil smazaný.',
    profile_close: 'Zavřít',
    footer_disclaimer: 'Neoficiální fanouškovský nástroj pro The Sims 4. Není nijak spojený s EA ani Maxis.',
  },
  en: {
    app_title: 'Sims Hub',
    tab_simsmix: 'Generator',
    tab_supersim: 'Super Sim',
    tab_randompacks: 'Random Packs',
    tab_wheel: 'Wheel',
    tab_random: 'RNG',
    tab_packs: 'Packs',
    tab_simgen: 'Sim',
    saved: 'Saved',
    saving: 'Saving…',
    error: 'Save failed',
    offline: 'Offline – saving later',
    conflict: 'Profile was modified on another device.',
    reload: 'Reload',
    retry: 'Retry',
    simsmix_gen_all: '🎲 Generate All',
    simsmix_copy_all: '📋 Copy Sim',
    simsmix_reset_all: 'Reset',
    simsmix_gender_title: 'Gender',
    simsmix_opt_random: 'Random',
    simsmix_opt_male: 'Boy',
    simsmix_opt_female: 'Girl',
    simsmix_gender_result: 'Result:',
    simsmix_gen_gender: '🎲 Generate Gender',
    simsmix_values_title: 'Character Values',
    simsmix_values_hint: 'Character values from the Parenthood game pack.',
    simsmix_gen_values: '🎲 Generate Values',
    simsmix_val_pos: 'Positive (+)',
    simsmix_val_neg: 'Negative (−)',
    simsmix_val_neu: 'Neutral (none)',
    simsmix_val_rnd: 'Random (?)',
    simsmix_aspirations_title: 'Aspirations',
    simsmix_gen_aspirations: '🎲 Generate Aspirations',
    stage_infant: 'Infant',
    stage_toddler: 'Toddler',
    stage_child: 'Childhood',
    stage_teen: 'Teen',
    stage_adult: 'Adult',
    simsmix_careers_title: 'Careers',
    simsmix_career_teen_label: 'Teen Part-Time Job',
    simsmix_career_adult_label: 'Adult Career',
    simsmix_include_branches: 'Include career branch',
    simsmix_gen_careers: '🎲 Generate Career',
    simsmix_traits_title: 'Personality Traits',
    simsmix_trait_child_label: 'Trait 1 (Child)',
    simsmix_trait_teen_label: 'Trait 2 (Teen)',
    simsmix_trait_adult_label: 'Trait 3 (Adult)',
    simsmix_gen_traits: '🎲 Generate Traits',
    simsmix_heredity_title: 'Parent Heredity',
    simsmix_heredity_enable: 'Inherit traits from parents',
    simsmix_heredity_hint: 'Parents traits have a significantly higher chance to be passed down.',
    simsmix_father_title: 'Father Traits',
    simsmix_mother_title: 'Mother Traits',
    simsmix_no_trait: '— No Trait —',
    rp_title: 'Random Pack Generator',
    rp_subtitle: 'James Turner style DLC randomizer with category weights and owned pack filters.',
    rp_count_label: 'Number of packs (1–20)',
    rp_each_cat: 'Guarantee at least one from each active category',
    rp_weights_title: 'Category Weights',
    rp_roll_btn: '🎲 Roll Packs',
    rp_copy_btn: '📋 Copy',
    rp_installed_title: 'Active Packs',
    rp_installed_hint: 'Check the packs you want to include in rolls. Stored per profile.',
    rp_select_all: 'Select All',
    rp_deselect_all: 'Deselect All',
    rp_search_placeholder: 'Search pack…',
    supersim_summary_title: 'Total Progress',
    supersim_search_placeholder: 'Search items…',
    age_all: 'All ages',
    supersim_hide_done: 'Hide completed',
    supersim_reset_all: 'Reset all',
    supersim_reset_section: 'Reset',
    supersim_hint: 'Left-click: +1 level. Right-click or long press: −1 level.',
    rnd_title_settings: 'Settings',
    rnd_title_result: 'Result',
    rnd_title_history: 'History',
    rnd_from: 'From',
    rnd_to: 'To',
    rnd_count: 'Count of numbers (1–100)',
    rnd_unique: 'No duplicates',
    rnd_sort: 'Sort',
    rnd_go: 'Generate',
    rnd_copy: 'Copy',
    rnd_clear_history: 'Clear history',
    rnd_hint: 'Click a number to copy it',
    rnd_empty: 'Nothing yet.',
    rnd_err_bounds: 'Enter valid integers for "From" and "To".',
    rnd_err_min_gt_max: '"From" value must be less than or equal to "To".',
    rnd_err_count: 'Count must be between 1 and 100.',
    rnd_err_span: 'Range is too large.',
    rnd_err_unique: 'Cannot draw that many unique numbers from the range.',
    category_expansion: 'Expansion Packs',
    category_gamepack: 'Game Packs',
    category_stuffpack: 'Stuff Packs',
    category_kit: 'Kits',
    copied_toast: 'Copied to clipboard.',
    copy_failed_toast: 'Failed to copy.',
    lock: 'Lock',
    unlock: 'Unlock',
    dialog_cancel: 'Cancel',
    dialog_ok: 'OK',
    rp_msg_no_active: 'No active packs. Select at least one pack with non-zero category weight.',
    rp_msg_only_n_available: 'Only {n} packs available, displaying all.',
    rnd_preset_coin: '🪙 Coin (1–2)',
    rnd_preset_d6: '🎲 Die d6',
    rnd_preset_2d6: '🎲 2d6',
    rnd_preset_d20: '🎯 d20',
    rnd_preset_100: '💯 1–100',
    rnd_preset_sim: '👨‍👩‍👧‍👦 Sim (1–8)',
    rnd_stats_sum: 'Sum',
    rnd_stats_avg: 'Average',
    rnd_stats_min: 'Min',
    rnd_stats_max: 'Max',
    rnd_nothing_to_copy: 'Nothing to copy.',
    wheel_items_title: 'Items',
    wheel_item_one: 'item',
    wheel_item_few: 'items',
    wheel_item_many: 'items',
    wheel_weight_one: 'weight',
    wheel_weight_few: 'weight',
    wheel_weight_many: 'weight',
    wheel_one_per_line: 'One item per line',
    wheel_placeholder: 'Pizza\nSushi\nPancakes x3',
    wheel_hint_weight: 'A line ending in x3 gets a 3x larger slice.',
    wheel_shuffle: '🔀 Shuffle',
    wheel_shuffle_title: 'Randomly shuffle item order',
    wheel_sort: '🔤 Sort',
    wheel_sort_title: 'Sort items alphabetically',
    wheel_clear: 'Clear',
    wheel_clear_title: 'Clear entire list',
    wheel_remove_winner: 'Remove winner after spin',
    wheel_sound: 'Sound',
    wheel_presets_title: 'Presets and saved lists',
    wheel_select_preset: '— Select preset —',
    wheel_preset_challenges: 'Sims 4 Challenges',
    wheel_preset_aspirations: 'Sims 4 Aspirations',
    wheel_preset_food: 'What to eat today',
    wheel_preset_activities: 'What to do today',
    wheel_preset_yes_no: 'Yes / No / Maybe',
    wheel_preset_who_turn: 'Whose turn is it',
    wheel_preset_load: 'Load',
    wheel_list_load: 'Load',
    wheel_list_delete: 'Delete',
    wheel_list_save: 'Save current list',
    wheel_spin: 'Spin',
    wheel_history_title: 'History',
    wheel_history_clear: 'Clear history',
    wheel_empty: 'Add items',
    wheel_winner_badge: '🎉 Winner',
    wheel_winner_title: 'Wheel of Fortune',
    wheel_winner_ok: 'Awesome!',
    wheel_msg_add_first: 'Add at least one item first.',
    wheel_no_saved_lists: 'No saved lists',
    wheel_shuffled_toast: 'List was shuffled.',
    wheel_sorted_toast: 'List was sorted alphabetically.',
    wheel_cleared_toast: 'List was cleared.',
    wheel_clear_confirm_title: 'Clear list',
    wheel_clear_confirm_msg: 'Are you sure you want to remove all items from the wheel?',
    wheel_preset_confirm_title: 'Load preset',
    wheel_preset_confirm_msg: 'The current list on the wheel will be replaced with this preset. Continue?',
    wheel_preset_loaded_toast: 'Preset loaded to wheel.',
    wheel_save_title: 'Save list',
    wheel_save_prompt: 'List name',
    wheel_save_overwrite_title: 'Overwrite list',
    wheel_save_overwrite_msg: 'List "{name}" already exists. Overwrite?',
    wheel_saved_toast: 'List saved.',
    wheel_delete_confirm_title: 'Delete list',
    wheel_delete_confirm_msg: 'Really delete list "{name}"?',
    wheel_deleted_toast: 'List deleted.',
    profile_manage: 'Manage Profiles',
    profile_new: 'New Profile',
    profile_name_prompt: 'Profile name',
    profile_create_btn: 'Create',
    profile_created_toast: 'Profile "{name}" is ready.',
    profile_rename: 'Rename',
    profile_new_name: 'New name',
    profile_rename_btn: 'Rename',
    profile_renamed_toast: 'Profile renamed.',
    profile_export: 'Export JSON',
    profile_import: 'Import JSON',
    profile_import_title: 'Import Profile',
    profile_import_prompt: 'New profile name',
    profile_import_btn: 'Import',
    profile_imported_toast: 'Profile imported.',
    profile_import_error: 'Could not parse file as JSON.',
    profile_delete: 'Delete Profile',
    profile_delete_title: 'Delete Profile',
    profile_delete_confirm: 'Really delete profile "{name}" with all data?',
    profile_delete_btn: 'Delete',
    profile_deleted_toast: 'Profile deleted.',
    profile_close: 'Close',
    footer_disclaimer: 'Unofficial fan tool for The Sims 4. Not affiliated with EA or Maxis.',
  }
};

let currentLang = (() => {
  try {
    const saved = localStorage.getItem('simshub:lang');
    if (saved && ['ru', 'cs', 'en'].includes(saved)) return saved;
  } catch { /* ignore */ }
  return 'ru'; // Default to Russian for girlfriend
})();

function getLanguage() {
  return currentLang;
}

function t(key, fallback = '') {
  const dict = I18N[currentLang] || I18N.ru;
  return dict[key] !== undefined ? dict[key] : (I18N.ru[key] !== undefined ? I18N.ru[key] : fallback);
}

function applyLanguage(lang) {
  if (!['ru', 'cs', 'en'].includes(lang)) lang = 'ru';
  currentLang = lang;
  try { localStorage.setItem('simshub:lang', lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;

  $$('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  $$('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const translation = t(key);
    if (translation) {
      if (el.tagName === 'INPUT' && el.placeholder) {
        el.placeholder = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  const ssSearch = $('#supersim-search');
  if (ssSearch) ssSearch.placeholder = t('supersim_search_placeholder');
  const rpSearch = $('#rp-search');
  if (rpSearch) rpSearch.placeholder = t('rp_search_placeholder');
  const wheelInput = $('#wheel-input');
  if (wheelInput) wheelInput.placeholder = t('wheel_placeholder');

  document.title = t('app_title', 'Sims Hub');

  if (typeof Simsmix !== 'undefined' && Simsmix.refreshIfActive) Simsmix.refreshIfActive();
  if (typeof RandomPacks !== 'undefined' && RandomPacks.refreshIfActive) RandomPacks.refreshIfActive();
  if (typeof Supersim !== 'undefined' && Supersim.refreshIfActive) Supersim.refreshIfActive();
  if (typeof Wheel !== 'undefined' && Wheel.refreshIfActive) Wheel.refreshIfActive();
  if (typeof RandomNumber !== 'undefined' && RandomNumber.refreshIfActive) RandomNumber.refreshIfActive();
}

function initLanguageSwitcher() {
  $$('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyLanguage(btn.dataset.lang);
    });
  });
}

/* ------------------------------------------------------------------ helpers */

function h(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') node.className = value;
      else if (key === 'dataset') Object.assign(node.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key in node && key !== 'list' && key !== 'style') {
        node[key] = value;
      } else {
        node.setAttribute(key, value === true ? '' : value);
      }
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
}

/* --------------------------------------------------------------- randomness */

/* Rejection sampling over crypto.getRandomValues — modulo alone would bias
   the low values whenever the bound does not divide the word range. */
function randomInt(bound) {
  if (!Number.isInteger(bound) || bound < 1) throw new RangeError('bound must be a positive integer');
  if (bound === 1) return 0;

  const cryptoObj = (typeof window !== 'undefined' && window.crypto) || (typeof crypto !== 'undefined' ? crypto : null);
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    return Math.floor(Math.random() * bound);
  }

  try {
    if (bound <= 0x100000000) {
      const limit = Math.floor(0x100000000 / bound) * bound;
      const buffer = new Uint32Array(1);
      let value;
      do {
        cryptoObj.getRandomValues(buffer);
        value = buffer[0];
      } while (value >= limit);
      return value % bound;
    }

    const max = Number.MAX_SAFE_INTEGER + 1;
    const limit = Math.floor(max / bound) * bound;
    const buffer = new Uint32Array(2);
    let value;
    do {
      cryptoObj.getRandomValues(buffer);
      value = (buffer[0] % 0x200000) * 0x100000000 + buffer[1];
    } while (value >= limit);
    return value % bound;
  } catch {
    return Math.floor(Math.random() * bound);
  }
}

function randomBetween(min, max) {
  return min + randomInt(max - min + 1);
}

function pickOne(list) {
  return list[randomInt(list.length)];
}

function shuffled(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function weightedPick(list, weightOf) {
  const weights = list.map((item) => Math.max(0, Math.round(weightOf(item))));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return null;
  let roll = randomInt(total);
  for (let i = 0; i < list.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return list[i];
  }
  return list[list.length - 1];
}

/* ------------------------------------------------------------------- toasts */

function toast(message, kind = 'info') {
  const node = h('div', { class: `toast toast-${kind}` }, message);
  $('#toasts').append(node);
  setTimeout(() => {
    node.classList.add('leaving');
    setTimeout(() => node.remove(), 300);
  }, 3200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied_toast', 'Zkopírováno do schránky.'), 'ok');
  } catch {
    // Clipboard API needs a secure context; fall back to a manual selection.
    const area = h('textarea', { value: text, class: 'copy-fallback' });
    document.body.append(area);
    area.select();
    const ok = document.execCommand && document.execCommand('copy');
    area.remove();
    toast(ok ? t('copied_toast', 'Zkopírováno do schránky.') : t('copy_failed_toast', 'Kopírování se nepovedlo.'), ok ? 'ok' : 'error');
  }
}

/* ------------------------------------------------------------------ dialogs */

const dialogEl = $('#dialog');
const dialogForm = $('#dialog-form');
const dialogTitle = $('#dialog-title');
const dialogBody = $('#dialog-body');
const dialogOk = $('#dialog-ok');
const dialogCancel = $('#dialog-cancel');
let dialogResolve = null;

dialogForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const resolve = dialogResolve;
  dialogResolve = null;
  dialogEl.close();
  if (resolve) resolve({ confirmed: true, form: new FormData(dialogForm) });
});

dialogCancel.addEventListener('click', () => {
  const resolve = dialogResolve;
  dialogResolve = null;
  dialogEl.close();
  if (resolve) resolve({ confirmed: false });
});

dialogEl.addEventListener('cancel', (event) => {
  event.preventDefault();
  const resolve = dialogResolve;
  dialogResolve = null;
  dialogEl.close();
  if (resolve) resolve({ confirmed: false });
});

function openDialog({ title, content, okLabel = 'OK', cancelLabel = 'Zrušit', danger = false, hideCancel = false }) {
  dialogTitle.textContent = title;
  clearNode(dialogBody);
  if (content) dialogBody.append(content);
  dialogOk.textContent = okLabel;
  dialogOk.classList.toggle('danger', danger);
  dialogCancel.textContent = cancelLabel;
  dialogCancel.hidden = hideCancel;
  dialogEl.showModal();
  const focusTarget = dialogBody.querySelector('input, select, textarea') || dialogOk;
  focusTarget.focus();
  if (focusTarget.select) focusTarget.select();
  return new Promise((resolve) => { dialogResolve = resolve; });
}

async function confirmDialog(title, message, okLabel = 'Potvrdit') {
  const result = await openDialog({
    title,
    content: h('p', { class: 'dialog-text' }, message),
    okLabel,
    danger: true,
  });
  return result.confirmed;
}

async function promptDialog(title, label, value = '', okLabel = 'Uložit') {
  const input = h('input', { type: 'text', name: 'value', value, maxLength: 80, required: true });
  const result = await openDialog({
    title,
    content: h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), input),
    okLabel,
  });
  if (!result.confirmed) return null;
  const text = String(result.form.get('value') || '').trim();
  return text || null;
}

async function infoDialog(title, message) {
  await openDialog({ title, content: h('p', { class: 'dialog-text' }, message), okLabel: 'Zavřít', hideCancel: true });
}

/* ---------------------------------------------------------------------- api */

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function api(path, options = {}) {
  const init = { headers: { 'Content-Type': 'application/json' }, ...options };
  const response = await fetch(BASE + path, init);
  if (!response.ok) {
    let message = `Server odpověděl chybou ${response.status}.`;
    try {
      const payload = await response.json();
      if (payload && payload.error) message = payload.error;
    } catch { /* keep the generic message */ }
    throw new ApiError(message, response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

/* ------------------------------------------------------------- local backup */

/* Purely a fallback so the app keeps working while the server is unreachable.
   The server stays the authority as soon as it answers again. */
const localCache = {
  key: (id) => `simshub:cache:${id}`,
  read(id) {
    try {
      const raw = localStorage.getItem(this.key(id));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  write(id, payload) {
    try { localStorage.setItem(this.key(id), JSON.stringify(payload)); } catch { /* quota */ }
  },
  readProfiles() {
    try {
      const raw = localStorage.getItem('simshub:profiles');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  writeProfiles(list) {
    try { localStorage.setItem('simshub:profiles', JSON.stringify(list)); } catch { /* quota */ }
  },
};

/* -------------------------------------------------------------- state shape */

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    wheel: { text: 'Pizza\nSushi\nPalačinky x3\nBurgery', removeWinner: false, sound: false, lists: [], history: [] },
    random: { min: 1, max: 100, count: 1, unique: false, sort: false, history: [] },
    simgen: { enabled: null, locks: {}, current: null, saved: [] },
    simsmix: {
      locks: {},
      genderOpt: 'random',
      valuesOpts: {},
      careerBranches: true,
      heredity: { enabled: false, father: ['', '', ''], mother: ['', '', ''] },
      current: null
    },
    packs: { owned: {}, count: 3, eachCategory: false, weights: { expansion: 30, gamepack: 30, stuffpack: 15, kit: 8 }, results: [] },
    supersim: { progress: {}, collapsed: {}, hideDone: false, age: '' },
  };
}

/* Fills in anything a stored blob predates, so an old profile never crashes a
   newer build. schemaVersion is what future migrations will branch on. */
function migrateState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const merged = { ...base, ...raw, schemaVersion: SCHEMA_VERSION };
  for (const key of ['wheel', 'random', 'simgen', 'simsmix', 'packs', 'supersim']) {
    merged[key] = { ...base[key], ...(raw[key] && typeof raw[key] === 'object' ? raw[key] : {}) };
  }
  if (!Array.isArray(merged.wheel.lists)) merged.wheel.lists = [];
  if (!Array.isArray(merged.wheel.history)) merged.wheel.history = [];
  if (!Array.isArray(merged.random.history)) merged.random.history = [];
  if (!Array.isArray(merged.simgen.saved)) merged.simgen.saved = [];
  if (!Array.isArray(merged.packs.results)) merged.packs.results = [];
  return merged;
}

/* -------------------------------------------------------------------- store */

const Store = {
  profiles: [],
  currentId: null,
  state: defaultState(),
  serverUpdatedAt: null,
  dirty: false,
  saving: false,
  version: 0,
  saveTimer: null,
  retryTimer: null,
  retryDelay: 2000,
  listeners: new Set(),

  onChange(fn) { this.listeners.add(fn); },
  emit() { for (const fn of this.listeners) fn(); },

  /* Called by every tool after it mutates state. */
  touch() {
    this.dirty = true;
    this.version += 1;
    this.setStatus('saving');
    localCache.write(this.currentId, { data: this.state, updated_at: this.serverUpdatedAt, dirty: true });
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
  },

  setStatus(status, detail = '') {
    const el = $('#save-status');
    const retry = $('#save-retry');
    el.dataset.state = status;
    el.textContent = {
      saving: t('saving', 'Ukládám…'),
      saved: t('saved', 'Uloženo'),
      error: t('error', 'Nepodařilo se uložit'),
      offline: t('offline', 'Offline – uložím později'),
    }[status] || status;
    if (detail) el.title = detail; else el.removeAttribute('title');
    retry.hidden = status !== 'error' && status !== 'offline';
  },

  async flush() {
    if (!this.dirty || this.saving || this.currentId === null) return;
    clearTimeout(this.retryTimer);
    this.saving = true;
    this.setStatus('saving');
    // The body is serialised now, so edits made while the request is in flight
    // are not in it; the version counter is what tells them apart afterwards.
    const body = JSON.stringify({ data: this.state });
    const sentVersion = this.version;
    const sentProfile = this.currentId;
    try {
      const saved = await api(`/api/profiles/${sentProfile}`, { method: 'PATCH', body });
      if (this.currentId !== sentProfile) { this.saving = false; return; }
      this.serverUpdatedAt = saved.updated_at;
      this.retryDelay = 2000;
      this.dirty = this.version !== sentVersion;
      this.saving = false;
      localCache.write(this.currentId, { data: this.state, updated_at: saved.updated_at, dirty: this.dirty });
      if (this.dirty) {
        this.flush();
      } else {
        this.setStatus('saved');
      }
    } catch (error) {
      this.saving = false;
      const offline = !navigator.onLine || !(error instanceof ApiError);
      this.setStatus(offline ? 'offline' : 'error', error.message);
      // Keep the pending changes and retry with a growing delay.
      this.retryTimer = setTimeout(() => this.flush(), this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, 30000);
    }
  },

  async loadProfiles() {
    try {
      this.profiles = await api('/api/profiles');
      localCache.writeProfiles(this.profiles);
    } catch (error) {
      const cached = localCache.readProfiles();
      if (!cached || !cached.length) throw error;
      this.profiles = cached;
      this.setStatus('offline', error.message);
    }
    renderProfileSelect();
  },

  async selectProfile(id, { force = false } = {}) {
    if (!force && id === this.currentId) return;
    if (this.dirty) await this.flush();
    this.currentId = id;
    try { localStorage.setItem('simshub:lastProfile', String(id)); } catch { /* ignore */ }

    try {
      const profile = await api(`/api/profiles/${id}`);
      this.serverUpdatedAt = profile.updated_at;
      this.state = migrateState(profile.data);
      this.dirty = false;
      localCache.write(id, { data: this.state, updated_at: profile.updated_at, dirty: false });
      hideConflictBanner();
      this.setStatus('saved');
    } catch (error) {
      const cached = localCache.read(id);
      if (cached) {
        this.state = migrateState(cached.data);
        this.serverUpdatedAt = cached.updated_at;
        this.setStatus('offline', error.message);
        toast(currentLang === 'ru' ? 'Сервер недоступен, работаем с сохраненной версией.' : (currentLang === 'en' ? 'Server unavailable, working with cached version.' : 'Server není dostupný, pracuješ s poslední známou verzí.'), 'warn');
      } else {
        this.state = defaultState();
        this.serverUpdatedAt = null;
        this.setStatus('offline', error.message);
        toast(currentLang === 'ru' ? 'Сервер недоступен, пустой профиль.' : (currentLang === 'en' ? 'Server unavailable, starting empty.' : 'Server není dostupný, začínáš s prázdným profilem.'), 'warn');
      }
    }
    renderProfileSelect();
    this.emit();
  },

  /* Cheap poll: the list endpoint carries updated_at for every profile. */
  async pollForRemoteChange() {
    if (this.currentId === null || this.saving) return;
    try {
      const list = await api('/api/profiles');
      this.profiles = list;
      localCache.writeProfiles(list);
      renderProfileSelect();
      const mine = list.find((p) => p.id === this.currentId);
      if (mine && this.serverUpdatedAt && mine.updated_at !== this.serverUpdatedAt) {
        if (this.dirty) {
          showConflictBanner(mine.updated_at);
        } else {
          // If the user has no unsaved local changes, smoothly sync latest state from server
          this.serverUpdatedAt = mine.updated_at;
          const full = await api(`/api/profiles/${this.currentId}`);
          this.state = migrateState(full.data);
          localCache.write(this.currentId, { data: this.state, updated_at: full.updated_at, dirty: false });
          hideConflictBanner();
          this.emit();
        }
      }
    } catch { /* offline polls are not worth reporting */ }
  },
};

/* --------------------------------------------------------- conflict banner */

function showConflictBanner(updatedAt) {
  const banner = $('#conflict-banner');
  if (!banner) return;
  const warning = Store.dirty
    ? (currentLang === 'ru' ? ' Несохраненные изменения будут потеряны.' : (currentLang === 'en' ? ' Unsaved changes will be lost.' : ' Tvoje neuložené změny se načtením zahodí.'))
    : '';
  const prefix = currentLang === 'ru'
    ? `Профиль был изменен (${formatTime(updatedAt)}).`
    : (currentLang === 'en' ? `Profile was modified (${formatTime(updatedAt)}).` : `Profil mezitím někdo změnil (${formatTime(updatedAt)}).`);
  $('#conflict-text').textContent = `${prefix}${warning}`;
  banner.hidden = false;
  banner.style.display = 'flex';
}

function hideConflictBanner() {
  const banner = $('#conflict-banner');
  if (!banner) return;
  banner.hidden = true;
  banner.style.display = 'none';
}

/* ------------------------------------------------------------- profile bar */

function renderProfileSelect() {
  const select = $('#profile-select');
  clearNode(select);
  for (const profile of Store.profiles) {
    select.append(h('option', { value: String(profile.id), selected: profile.id === Store.currentId }, profile.name));
  }
}

async function createProfileFlow() {
  const name = await promptDialog(t('profile_new', 'Nový profil'), t('profile_name_prompt', 'Název profilu'), '', t('profile_create_btn', 'Vytvořit'));
  if (!name) return;
  try {
    const profile = await api('/api/profiles', { method: 'POST', body: JSON.stringify({ name }) });
    await Store.loadProfiles();
    await Store.selectProfile(profile.id, { force: true });
    toast(t('profile_created_toast', 'Profil je připravený.').replace('{name}', profile.name), 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function renameProfileFlow() {
  const current = Store.profiles.find((p) => p.id === Store.currentId);
  if (!current) return;
  const name = await promptDialog(t('profile_rename', 'Přejmenovat profil'), t('profile_new_name', 'Nový název'), current.name, t('profile_rename_btn', 'Přejmenovat'));
  if (!name || name === current.name) return;
  try {
    await api(`/api/profiles/${current.id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
    await Store.loadProfiles();
    toast(t('profile_renamed_toast', 'Profil přejmenovaný.'), 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function deleteProfileFlow() {
  const current = Store.profiles.find((p) => p.id === Store.currentId);
  if (!current) return;
  const ok = await confirmDialog(t('profile_delete_title', 'Smazat profil'), t('profile_delete_confirm', 'Opravdu smazat profil?').replace('{name}', current.name), t('profile_delete_btn', 'Smazat'));
  if (!ok) return;
  try {
    await api(`/api/profiles/${current.id}`, { method: 'DELETE' });
    try { localStorage.removeItem(localCache.key(current.id)); } catch { /* ignore */ }
    await Store.loadProfiles();
    const next = Store.profiles[0];
    if (next) await Store.selectProfile(next.id, { force: true });
    toast(t('profile_deleted_toast', 'Profil smazaný.'), 'ok');
  } catch (error) {
    toast(error.message, 'error');
  }
}

async function importProfileFlow() {
  const input = h('input', { type: 'file', accept: 'application/json,.json' });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const data = payload && payload.data && typeof payload.data === 'object' ? payload.data : payload;
      const suggested = (payload && payload.name) || file.name.replace(/\.json$/i, '');
      const name = await promptDialog(t('profile_import_title', 'Import profilu'), t('profile_import_prompt', 'Název nového profilu'), suggested, t('profile_import_btn', 'Importovat'));
      if (!name) return;
      const profile = await api('/api/profiles/import', { method: 'POST', body: JSON.stringify({ name, data }) });
      await Store.loadProfiles();
      await Store.selectProfile(profile.id, { force: true });
      toast(t('profile_imported_toast', 'Profil naimportovaný.'), 'ok');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : t('profile_import_error', 'Soubor se nepodařilo načíst jako JSON.'), 'error');
    }
  });
  input.click();
}

async function manageProfilesFlow() {
  const actions = h('div', { class: 'dialog-actions-list' },
    h('button', { class: 'ghost-btn', type: 'button', onclick: () => finish(createProfileFlow) }, t('profile_new', 'Nový profil')),
    h('button', { class: 'ghost-btn', type: 'button', onclick: () => finish(renameProfileFlow) }, t('profile_rename', 'Přejmenovat')),
    h('button', {
      class: 'ghost-btn',
      type: 'button',
      onclick: () => {
        window.location.href = `${BASE}/api/profiles/${Store.currentId}/export`;
        closeDialog();
      },
    }, t('profile_export', 'Exportovat JSON')),
    h('button', { class: 'ghost-btn', type: 'button', onclick: () => finish(importProfileFlow) }, t('profile_import', 'Importovat JSON')),
    h('button', { class: 'ghost-btn danger', type: 'button', onclick: () => finish(deleteProfileFlow) }, t('profile_delete', 'Smazat profil')),
  );

  function closeDialog() {
    const resolve = dialogResolve;
    dialogResolve = null;
    dialogEl.close();
    if (resolve) resolve({ confirmed: false });
  }

  function finish(action) {
    closeDialog();
    setTimeout(action, 0);
  }

  await openDialog({ title: t('profile_manage', 'Profily'), content: actions, okLabel: t('profile_close', 'Zavřít'), hideCancel: true });
}

/* -------------------------------------------------------------------- theme */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim');
  try { localStorage.setItem('simshub:theme', theme); } catch { /* ignore */ }
}

function initTheme() {
  let theme;
  try { theme = localStorage.getItem('simshub:theme'); } catch { theme = null; }
  if (theme !== 'dark' && theme !== 'light') {
    theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  applyTheme(theme);
  $('#theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

/* ------------------------------------------------------------- shared data */

const dataCache = new Map();

async function loadData(name) {
  if (dataCache.has(name)) return dataCache.get(name);
  const promise = (async () => {
    const response = await fetch(`${BASE}/data/${name}.json`);
    if (!response.ok) throw new Error(`Soubor data/${name}.json se nepodařilo načíst (${response.status}).`);
    return response.json();
  })();
  dataCache.set(name, promise);
  promise.catch(() => dataCache.delete(name));
  return promise;
}

function showTabError(elementId, message) {
  const node = $(`#${elementId}`);
  if (!node) return;
  clearNode(node);
  node.append(h('p', { class: 'error-text' }, message));
  node.hidden = false;
}

function hideTabError(elementId) {
  const node = $(`#${elementId}`);
  if (node) node.hidden = true;
}

/* Owned packs live in the profile and are shared by three tools. Packs missing
   from the map count as owned, so a newly released pack is not silently off. */
function isPackOwned(packName) {
  if (packRegistry.size > 0 && !packRegistry.has(packName)) return false;
  const owned = Store.state.packs.owned || {};
  return owned[packName] !== false;
}

const packRegistry = new Map();

async function ensurePacksLoaded() {
  if (packRegistry.size > 0) return packRegistry;
  try {
    const doc = await loadData('packs');
    if (doc && Array.isArray(doc.packs)) {
      for (const p of doc.packs) {
        packRegistry.set(p.name, p);
      }
    }
  } catch { /* offline or load error */ }
  return packRegistry;
}

function packIconUrl(icon) {
  if (!icon) return null;
  return BASE ? `${BASE}/${icon}` : icon;
}

function packIconOf(packName) {
  if (!packName) return null;
  const p = packRegistry.get(packName);
  return p && p.icon ? p.icon : null;
}

function packNameCsOf(packName) {
  if (!packName) return null;
  const p = packRegistry.get(packName);
  return p && p.nameCs ? p.nameCs : packName;
}

function packNameOf(packName) {
  if (!packName) return '';
  const p = packRegistry.get(packName);
  if (!p) return packName;
  if (currentLang === 'ru' && p.nameRu) return p.nameRu;
  if (currentLang === 'cs' && p.nameCs) return p.nameCs;
  return p.name || packName;
}

function packSubNameOf(packName) {
  if (!packName) return '';
  const p = packRegistry.get(packName);
  if (!p) return '';
  const main = packNameOf(packName);
  if (main !== p.name) return p.name;
  return '';
}

/* --------------------------------------------------------------- tab router */

const tabs = new Map();
let currentRoute = null;

function registerTab(route, handlers) {
  tabs.set(route, handlers);
}

function routeFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (raw === 'simgen') return 'simsmix';
  if (raw === 'packs') return 'randompacks';
  return tabs.has(raw) ? raw : 'simsmix';
}

async function activateRoute(route) {
  currentRoute = route;
  for (const [name, handlers] of tabs) {
    const panel = $(`#panel-${name}`);
    const button = $(`#tab-${name}`);
    if (!panel || !button) continue;
    const active = name === route;
    panel.hidden = !active;
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.tabIndex = active ? 0 : -1;
    button.classList.toggle('active', active);
    if (active && handlers.activate) await handlers.activate();
  }
}

function initTabs() {
  const buttons = $$('#tabs .tab');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      window.location.hash = `#/${button.dataset.route}`;
    });
    button.addEventListener('keydown', (event) => {
      const index = buttons.indexOf(button);
      let next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === null) return;
      event.preventDefault();
      buttons[next].focus();
      window.location.hash = `#/${buttons[next].dataset.route}`;
    });
  });
  window.addEventListener('hashchange', () => activateRoute(routeFromHash()));
}

/* ==========================================================================
   TAB 1 — Kolo štěstí
   ========================================================================== */

const Wheel = (() => {
  const SPIN_MS = 5000;
  const EASING = [0.12, 0.72, 0.12, 1];
  const MAX_TICKS = 240;

  const WHEEL_PALETTE = [
    '#5a3fc0', // Deep purple
    '#0284c7', // Sapphire blue
    '#059669', // Emerald green
    '#d97706', // Amber gold
    '#db2777', // Rose pink
    '#7c3aed', // Bright violet
    '#0d9488', // Teal
    '#ea580c', // Orange
    '#0891b2', // Cyan
    '#be123c', // Crimson
    '#4f46e5', // Indigo
    '#65a30d', // Lime
  ];

  const PRESETS = {
    ru: {
      'sims-challenges': [
        'Из грязи в князи (Rags to Riches)',
        '100 детей',
        'Не такой как все (Not So Berry)',
        'Черная вдова',
        'Династия (Legacy)',
        'Бомж (Бездомный)',
        'Жизнь в глуши',
        'Крошечный дом (Tiny Living)',
      ].join('\n'),
      'sims-aspirations': [
        'Творчество x2',
        'Состояние',
        'Любовь и романтика',
        'Знания и наука x2',
        'Природа и спорт',
        'Еда и кулинария',
        'Семья',
        'Популярность',
      ].join('\n'),
      'food': [
        'Пицца x2',
        'Суши',
        'Паста',
        'Бургеры x2',
        'Блинчики',
        'Салат',
        'Курица с рисом',
        'Вок / Азиатская кухня',
      ].join('\n'),
      'activities': [
        'Играть в The Sims 4 x3',
        'Посмотреть фильм',
        'Пойти на прогулку',
        'Почитать книгу',
        'Построить дом в Sims x2',
        'Настольная игра',
      ].join('\n'),
      'yes-no': [
        'Определенно да x2',
        'Скорее да',
        'Точно нет x2',
        'Скорее нет',
        'Спроси позже',
      ].join('\n'),
      'who-turn': [
        'Игрок 1',
        'Игрок 2',
      ].join('\n'),
    },
    cs: {
      'sims-challenges': [
        'Rags to Riches',
        '100 dětí',
        'Not So Berry',
        'Černá vdova',
        'Generační výzva (Legacy)',
        'Bezdomovec',
        'Život na samotě',
        'Malý dům (Tiny Living)',
      ].join('\n'),
      'sims-aspirations': [
        'Kreativita x2',
        'Bohatství',
        'Láska a romantika',
        'Znalosti a věda x2',
        'Příroda a outdoor',
        'Jídlo a vaření',
        'Rodina',
        'Popularita',
      ].join('\n'),
      'food': [
        'Pizza x2',
        'Sushi',
        'Těstoviny',
        'Burgery x2',
        'Palačinky',
        'Salát',
        'Kuře s rýží',
        'Čína / Wok',
      ].join('\n'),
      'activities': [
        'Hrát The Sims 4 x3',
        'Koukat na film',
        'Jít na procházku',
        'Číst knížku',
        'Stavět dům v Sims x2',
        'Společenská hra',
      ].join('\n'),
      'yes-no': [
        'Určitě ano x2',
        'Spíše ano',
        'Rozhodně ne x2',
        'Spíše ne',
        'Zeptej se později',
      ].join('\n'),
      'who-turn': [
        'Hráč 1',
        'Hráč 2',
      ].join('\n'),
    },
    en: {
      'sims-challenges': [
        'Rags to Riches',
        '100 Baby Challenge',
        'Not So Berry',
        'Black Widow',
        'Legacy Challenge',
        'Homeless Challenge',
        'Off the Grid',
        'Tiny Living',
      ].join('\n'),
      'sims-aspirations': [
        'Creativity x2',
        'Fortune',
        'Love & Romance',
        'Knowledge & Science x2',
        'Nature & Outdoor',
        'Food & Cooking',
        'Family',
        'Popularity',
      ].join('\n'),
      'food': [
        'Pizza x2',
        'Sushi',
        'Pasta',
        'Burgers x2',
        'Pancakes',
        'Salad',
        'Chicken & Rice',
        'Asian / Wok',
      ].join('\n'),
      'activities': [
        'Play The Sims 4 x3',
        'Watch a Movie',
        'Go for a Walk',
        'Read a Book',
        'Build a House in Sims x2',
        'Board Game',
      ].join('\n'),
      'yes-no': [
        'Definitely Yes x2',
        'Probably Yes',
        'Definitely No x2',
        'Probably Not',
        'Ask Again Later',
      ].join('\n'),
      'who-turn': [
        'Player 1',
        'Player 2',
      ].join('\n'),
    },
  };

  function getPreset(key) {
    const dict = PRESETS[currentLang] || PRESETS.ru;
    return (dict && dict[key]) || (PRESETS.cs && PRESETS.cs[key]) || '';
  }

  let segments = [];
  let rotation = 0;
  let spinning = false;
  let audioCtx = null;

  const rotor = () => $('#wheel-rotor');

  /* "Palačinky x3" → three times the segment size. */
  function parseItems(text) {
    return String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(.*?)\s*[x×]\s*(\d{1,2})$/i);
        if (match && match[1].trim()) {
          return { label: match[1].trim(), weight: clamp(Number(match[2]), 1, 50) };
        }
        return { label: line, weight: 1 };
      });
  }

  function pointOnCircle(angle, radius) {
    const rad = (angle * Math.PI) / 180;
    return [200 + radius * Math.sin(rad), 200 - radius * Math.cos(rad)];
  }

  function truncate(label, maxChars) {
    if (label.length <= maxChars) return label;
    return `${label.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }

  function getSegmentColor(index, count) {
    if (count <= WHEEL_PALETTE.length) {
      if (count === 2) return index === 0 ? '#5a3fc0' : '#0d9488';
      let cIndex = index % WHEEL_PALETTE.length;
      if (index === count - 1 && cIndex === 0) {
        cIndex = (cIndex + 1) % WHEEL_PALETTE.length;
      }
      return WHEEL_PALETTE[cIndex];
    }
    const hue = Math.round((index * 360) / count);
    const lightness = index % 2 === 0 ? 46 : 56;
    return `hsl(${hue} 68% ${lightness}%)`;
  }

  function updateCounter(items) {
    const countEl = $('#wheel-count');
    if (!countEl) return;
    const count = items.length;
    if (count === 0) {
      countEl.textContent = `0 ${t('wheel_item_many', 'položek')}`;
      return;
    }
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const itemWord = count === 1 ? t('wheel_item_one', 'položka') : count >= 2 && count <= 4 ? t('wheel_item_few', 'položky') : t('wheel_item_many', 'položek');
    if (totalWeight === count) {
      countEl.textContent = `${count} ${itemWord}`;
    } else {
      const weightWord = totalWeight === 1 ? t('wheel_weight_one', 'váha') : totalWeight >= 2 && totalWeight <= 4 ? t('wheel_weight_few', 'váhy') : t('wheel_weight_many', 'vah');
      countEl.textContent = `${count} ${itemWord} · ${totalWeight} ${weightWord}`;
    }
  }

  function renderHub(svg) {
    const ns = 'http://www.w3.org/2000/svg';
    const hub = document.createElementNS(ns, 'circle');
    hub.setAttribute('cx', '200');
    hub.setAttribute('cy', '200');
    hub.setAttribute('r', '27');
    hub.setAttribute('class', 'wheel-hub');
    svg.append(hub);

    const mark = document.createElementNS(ns, 'text');
    mark.setAttribute('x', '200');
    mark.setAttribute('y', '201');
    mark.setAttribute('text-anchor', 'middle');
    mark.setAttribute('dominant-baseline', 'central');
    mark.setAttribute('class', 'wheel-hub-mark');
    mark.textContent = '◆';
    svg.append(mark);
  }

  function render() {
    const svg = $('#wheel-svg');
    const items = parseItems(Store.state.wheel.text);
    clearNode(svg);
    segments = [];
    updateCounter(items);

    if (!items.length) {
      svg.append(h('circle', { cx: 200, cy: 200, r: 190, class: 'wheel-empty' }));
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '200');
      label.setAttribute('y', '206');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'wheel-empty-text');
      label.textContent = t('wheel_empty', 'Přidej položky');
      svg.append(label);
      return;
    }

    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let cursor = 0;
    const ns = 'http://www.w3.org/2000/svg';

    if (items.length === 1) {
      const item = items[0];
      segments.push({ ...item, start: 0, end: 360, mid: 180, index: 0 });

      const circle = document.createElementNS(ns, 'circle');
      circle.setAttribute('cx', '200');
      circle.setAttribute('cy', '200');
      circle.setAttribute('r', '190');
      circle.setAttribute('fill', '#5a3fc0');
      circle.setAttribute('stroke', 'rgba(0,0,0,0.18)');
      circle.setAttribute('stroke-width', '2');
      svg.append(circle);

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', '200');
      label.setAttribute('y', '125');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', '22');
      label.setAttribute('class', 'wheel-label');
      label.textContent = truncate(item.label, 20);
      svg.append(label);

      renderHub(svg);
      return;
    }

    items.forEach((item, index) => {
      const sweep = (item.weight / total) * 360;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      const mid = (start + end) / 2;
      segments.push({ ...item, start, end, mid, index });

      const group = document.createElementNS(ns, 'g');

      const title = document.createElementNS(ns, 'title');
      title.textContent = item.weight > 1 ? `${item.label} (${item.weight}× váha)` : item.label;
      group.append(title);

      const path = document.createElementNS(ns, 'path');
      const [x1, y1] = pointOnCircle(start, 190);
      const [x2, y2] = pointOnCircle(end, 190);
      const largeArc = sweep > 180 ? 1 : 0;
      path.setAttribute('d', `M200,200 L${x1.toFixed(2)},${y1.toFixed(2)} A190,190 0 ${largeArc},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`);
      path.setAttribute('fill', getSegmentColor(index, items.length));
      path.setAttribute('stroke', 'rgba(0,0,0,0.2)');
      path.setAttribute('stroke-width', '1.5');
      group.append(path);

      let fontSize = 16;
      if (sweep >= 100) fontSize = 21;
      else if (sweep >= 60) fontSize = 18;
      else if (sweep >= 35) fontSize = 15;
      else if (sweep >= 22) fontSize = 13;
      else if (sweep >= 14) fontSize = 11;
      else if (sweep >= 9) fontSize = 10;
      else fontSize = 9;

      const maxChars = Math.max(3, Math.floor(140 / (fontSize * 0.56)));

      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', '378');
      label.setAttribute('y', '200');
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-size', String(fontSize));
      label.setAttribute('class', 'wheel-label');
      label.setAttribute('transform', `rotate(${(mid - 90).toFixed(2)} 200 200)`);
      label.textContent = truncate(item.label, maxChars);
      group.append(label);

      svg.append(group);
    });

    renderHub(svg);
  }

  function bezierTimeForProgress(progress, [x1, y1, x2, y2]) {
    const curve = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 30; i += 1) {
      const mid = (low + high) / 2;
      if (curve(mid, y1, y2) < progress) low = mid; else high = mid;
    }
    return curve((low + high) / 2, x1, x2);
  }

  function ensureAudio() {
    if (!Store.state.wheel.sound) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function scheduleTicks(from, to) {
    const ctx = ensureAudio();
    if (!ctx || !segments.length || to <= from) return;
    const boundaries = segments.map((segment) => segment.start);
    const crossings = [];
    for (const boundary of boundaries) {
      const first = Math.ceil((from + boundary) / 360);
      for (let k = first; ; k += 1) {
        const value = k * 360 - boundary;
        if (value > to) break;
        if (value > from) crossings.push(value);
        if (crossings.length > 2000) break;
      }
    }
    crossings.sort((a, b) => a - b);
    const step = Math.max(1, Math.ceil(crossings.length / MAX_TICKS));
    for (let i = 0; i < crossings.length; i += step) {
      const progress = (crossings[i] - from) / (to - from);
      const at = ctx.currentTime + (bezierTimeForProgress(progress, EASING) * SPIN_MS) / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, at);
      osc.frequency.exponentialRampToValueAtTime(200, at + 0.025);
      gain.gain.setValueAtTime(0.001, at);
      gain.gain.linearRampToValueAtTime(0.06, at + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.035);
    }
  }

  function setControlsDisabled(disabled) {
    const ids = [
      '#wheel-spin',
      '#wheel-input',
      '#wheel-shuffle',
      '#wheel-sort',
      '#wheel-clear',
      '#wheel-remove',
      '#wheel-sound',
      '#wheel-preset-load',
      '#wheel-list-save',
      '#wheel-list-load',
      '#wheel-list-delete',
      '#wheel-history-clear',
    ];
    for (const id of ids) {
      const el = $(id);
      if (el) el.disabled = disabled;
    }
  }

  function finish(winner) {
    spinning = false;
    setControlsDisabled(false);
    const state = Store.state.wheel;
    state.history.unshift({ label: winner.label, at: new Date().toISOString() });
    state.history = state.history.slice(0, HISTORY_LIMIT);

    if (state.removeWinner) {
      const lines = state.text.split('\n');
      const target = lines.findIndex((line) => {
        const parsed = parseItems(line)[0];
        return parsed && parsed.label === winner.label;
      });
      if (target >= 0) {
        lines.splice(target, 1);
        state.text = lines.join('\n');
        $('#wheel-input').value = state.text;
        render();
      }
    }

    Store.touch();
    renderHistory();

    const winnerContent = h(
      'div',
      { class: 'winner-wrap' },
      h('div', { class: 'winner-badge' }, t('wheel_winner_badge', '🎉 Vítězná volba')),
      h('p', { class: 'winner' }, winner.label)
    );

    openDialog({
      title: t('wheel_winner_title', 'Kolo štěstí'),
      content: winnerContent,
      okLabel: t('wheel_winner_ok', 'Skvělé!'),
      hideCancel: true,
    });
  }

  function spin() {
    if (spinning) return;
    if (!segments.length) {
      $('#wheel-message').textContent = t('wheel_msg_add_first', 'Nejdřív přidej aspoň jednu položku.');
      return;
    }
    $('#wheel-message').textContent = '';

    const winner = weightedPick(segments, (segment) => segment.weight);
    const half = (winner.end - winner.start) / 2;
    const jitter = (randomInt(1000) / 1000 - 0.5) * 2 * half * 0.7;
    const targetAngle = winner.mid + jitter;

    const normalized = ((rotation % 360) + 360) % 360;
    const delta = (360 - ((targetAngle + normalized) % 360)) % 360;
    const turns = 4 + randomInt(3);
    const to = rotation + turns * 360 + delta;

    if (prefersReducedMotion()) {
      rotation = to;
      rotor().style.transition = 'none';
      rotor().style.transform = `rotate(${rotation}deg)`;
      finish(winner);
      return;
    }

    spinning = true;
    setControlsDisabled(true);
    scheduleTicks(rotation, to);
    rotor().style.transition = `transform ${SPIN_MS}ms cubic-bezier(${EASING.join(',')})`;
    void rotor().offsetWidth;
    rotation = to;
    rotor().style.transform = `rotate(${rotation}deg)`;

    let finished = false;
    const onEnd = (event) => {
      if (event && event.target !== rotor()) return;
      if (finished) return;
      finished = true;
      rotor().removeEventListener('transitionend', onEnd);
      if (spinning) finish(winner);
    };

    rotor().addEventListener('transitionend', onEnd);
    setTimeout(() => {
      if (!finished && spinning) {
        finished = true;
        rotor().removeEventListener('transitionend', onEnd);
        finish(winner);
      }
    }, SPIN_MS + 120);
  }

  function renderHistory() {
    const list = $('#wheel-history');
    clearNode(list);
    const history = Store.state.wheel.history;
    if (!history.length) {
      list.append(h('li', { class: 'muted' }, t('rnd_empty', 'Zatím nic.')));
      return;
    }
    for (const entry of history) {
      list.append(h('li', {}, h('span', {}, entry.label), h('time', { class: 'muted' }, formatTime(entry.at))));
    }
  }

  function renderLists() {
    const select = $('#wheel-lists');
    clearNode(select);
    const lists = Store.state.wheel.lists;
    if (!lists.length) {
      select.append(h('option', { value: '' }, t('wheel_no_saved_lists', 'Žádný uložený seznam')));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    for (const list of lists) select.append(h('option', { value: list.name }, list.name));
  }

  function syncFromState() {
    const state = Store.state.wheel;
    $('#wheel-input').value = state.text;
    $('#wheel-remove').checked = Boolean(state.removeWinner);
    $('#wheel-sound').checked = Boolean(state.sound);
    rotation = 0;
    rotor().style.transition = 'none';
    rotor().style.transform = 'rotate(0deg)';
    render();
    renderHistory();
    renderLists();
  }

  function init() {
    $('#wheel-input').addEventListener('input', (event) => {
      Store.state.wheel.text = event.target.value;
      render();
      Store.touch();
    });
    $('#wheel-remove').addEventListener('change', (event) => {
      Store.state.wheel.removeWinner = event.target.checked;
      Store.touch();
    });
    $('#wheel-sound').addEventListener('change', (event) => {
      Store.state.wheel.sound = event.target.checked;
      if (event.target.checked) ensureAudio();
      Store.touch();
    });
    $('#wheel-spin').addEventListener('click', spin);
    $('#wheel-svg').addEventListener('click', spin);

    $('#wheel-shuffle').addEventListener('click', () => {
      if (spinning) return;
      const lines = String($('#wheel-input').value || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;
      const mixed = shuffled(lines);
      Store.state.wheel.text = mixed.join('\n');
      $('#wheel-input').value = Store.state.wheel.text;
      render();
      Store.touch();
      toast(t('wheel_shuffled_toast', 'Seznam byl náhodně promíchán.'), 'ok');
    });

    $('#wheel-sort').addEventListener('click', () => {
      if (spinning) return;
      const lines = String($('#wheel-input').value || '').split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) return;
      lines.sort((a, b) => a.localeCompare(b, currentLang));
      Store.state.wheel.text = lines.join('\n');
      $('#wheel-input').value = Store.state.wheel.text;
      render();
      Store.touch();
      toast(t('wheel_sorted_toast', 'Seznam byl seřazen podle abecedy.'), 'ok');
    });

    $('#wheel-clear').addEventListener('click', async () => {
      if (spinning) return;
      if (!Store.state.wheel.text.trim()) return;
      const ok = await confirmDialog(t('wheel_clear_confirm_title', 'Vyčistit seznam'), t('wheel_clear_confirm_msg', 'Opravdu chceš smazat všechny položky z kola?'), t('wheel_clear', 'Vyčistit'));
      if (!ok) return;
      Store.state.wheel.text = '';
      $('#wheel-input').value = '';
      render();
      Store.touch();
      toast(t('wheel_cleared_toast', 'Seznam byl vyčištěn.'), 'ok');
    });

    $('#wheel-preset-load').addEventListener('click', async () => {
      if (spinning) return;
      const key = $('#wheel-presets').value;
      const presetText = getPreset(key);
      if (!key || !presetText) return;
      if (Store.state.wheel.text.trim()) {
        const ok = await confirmDialog(t('wheel_preset_confirm_title', 'Vložit předlohu'), t('wheel_preset_confirm_msg', 'Aktuální seznam na kole bude nahrazen touto předlohou. Chceš pokračovat?'), t('wheel_preset_load', 'Vložit'));
        if (!ok) return;
      }
      Store.state.wheel.text = presetText;
      $('#wheel-input').value = Store.state.wheel.text;
      render();
      Store.touch();
      toast(t('wheel_preset_loaded_toast', 'Předloha byla vložena na kolo.'), 'ok');
    });

    $('#wheel-history-clear').addEventListener('click', () => {
      Store.state.wheel.history = [];
      renderHistory();
      Store.touch();
    });

    $('#wheel-list-save').addEventListener('click', async () => {
      const name = await promptDialog(t('wheel_save_title', 'Uložit seznam'), t('wheel_save_prompt', 'Název seznamu'));
      if (!name) return;
      const lists = Store.state.wheel.lists;
      const existing = lists.findIndex((list) => list.name === name);
      if (existing >= 0) {
        const ok = await confirmDialog(t('wheel_save_overwrite_title', 'Přepsat seznam'), t('wheel_save_overwrite_msg', 'Seznam „{name}“ už existuje. Přepsat ho?').replace('{name}', name), t('wheel_save_overwrite_title', 'Přepsat'));
        if (!ok) return;
        lists[existing].text = Store.state.wheel.text;
      } else {
        lists.push({ name, text: Store.state.wheel.text });
      }
      renderLists();
      $('#wheel-lists').value = name;
      Store.touch();
      toast(t('wheel_saved_toast', 'Seznam uložený.'), 'ok');
    });

    $('#wheel-list-load').addEventListener('click', () => {
      const name = $('#wheel-lists').value;
      const list = Store.state.wheel.lists.find((item) => item.name === name);
      if (!list) return;
      Store.state.wheel.text = list.text;
      $('#wheel-input').value = list.text;
      render();
      Store.touch();
    });

    $('#wheel-list-delete').addEventListener('click', async () => {
      const name = $('#wheel-lists').value;
      if (!name) return;
      const ok = await confirmDialog(t('wheel_delete_confirm_title', 'Smazat seznam'), t('wheel_delete_confirm_msg', 'Opravdu smazat seznam „{name}“?').replace('{name}', name), t('wheel_list_delete', 'Smazat'));
      if (!ok) return;
      Store.state.wheel.lists = Store.state.wheel.lists.filter((list) => list.name !== name);
      renderLists();
      Store.touch();
      toast(t('wheel_deleted_toast', 'Seznam smazaný.'), 'ok');
    });

    registerTab('wheel', { activate: () => {} });
  }

  return {
    init,
    syncFromState,
    refreshIfActive: () => {
      render();
      renderHistory();
      renderLists();
    }
  };
})();

/* ==========================================================================
   TAB 2 — Náhodné číslo

const RandomNumber = (() => {
  const FLICKER_MS = 500;
  let flickerTimer = null;
  let lastResult = [];

  function readInputs() {
    const minRaw = $('#rnd-min').value.trim();
    const maxRaw = $('#rnd-max').value.trim();
    const countRaw = $('#rnd-count').value.trim();

    const min = minRaw === '' ? NaN : Math.trunc(Number(minRaw));
    const max = maxRaw === '' ? NaN : Math.trunc(Number(maxRaw));
    const count = countRaw === '' ? NaN : Math.trunc(Number(countRaw));
    return { min, max, count };
  }

  function setError(message) {
    const node = $('#rnd-error');
    node.textContent = message || '';
    node.hidden = !message;
  }

  function draw(min, max, count, unique) {
    const span = max - min + 1;
    if (!unique) {
      return Array.from({ length: count }, () => randomBetween(min, max));
    }
    // Partial Fisher-Yates shuffle for small spans: O(count) and zero duplicate collisions
    if (span <= 2000) {
      const pool = Array.from({ length: span }, (_, i) => min + i);
      for (let i = 0; i < count; i += 1) {
        const j = i + randomInt(span - i);
        const temp = pool[i];
        pool[i] = pool[j];
        pool[j] = temp;
      }
      return pool.slice(0, count);
    }
    // Set rejection for very large spans
    const chosen = new Set();
    while (chosen.size < count) chosen.add(randomBetween(min, max));
    return Array.from(chosen);
  }

  function renderNumbers(numbers, isFinal) {
    const box = $('#rnd-result');
    const statsEl = $('#rnd-stats');
    const hintEl = $('#rnd-hint');
    clearNode(box);

    if (!numbers.length) {
      box.classList.remove('grid', 'flickering');
      box.append(h('span', { class: 'rnd-placeholder' }, '—'));
      if (statsEl) statsEl.hidden = true;
      if (hintEl) hintEl.hidden = true;
      return;
    }

    box.classList.toggle('flickering', !isFinal);
    box.classList.toggle('grid', numbers.length > 6);

    const count = numbers.length;
    const loc = currentLang === 'ru' ? 'ru-RU' : (currentLang === 'en' ? 'en-US' : 'cs-CZ');
    for (const value of numbers) {
      const formatted = value.toLocaleString(loc);
      let cellClass = 'rnd-single';
      if (count >= 2 && count <= 6) {
        cellClass = 'rnd-pill';
      } else if (count > 6) {
        cellClass = 'rnd-cell';
      }

      const copyTitle = isFinal
        ? (currentLang === 'ru' ? `Нажмите, чтобы скопировать число ${formatted}` : (currentLang === 'en' ? `Click to copy number ${formatted}` : `Kliknutím zkopíruješ číslo ${formatted}`))
        : '';
      const item = h('span', {
        class: cellClass,
        title: copyTitle,
        onclick: isFinal ? () => copyText(String(value)) : null,
      }, formatted);
      box.append(item);
    }

    if (statsEl) {
      if (isFinal && count > 1) {
        const sum = numbers.reduce((acc, n) => acc + n, 0);
        const avg = Math.round((sum / count) * 10) / 10;
        const minVal = Math.min(...numbers);
        const maxVal = Math.max(...numbers);
        statsEl.textContent = `${t('rnd_stats_sum', 'Součet')}: ${sum.toLocaleString(loc)} · ${t('rnd_stats_avg', 'Průměr')}: ${avg.toLocaleString(loc)} · ${t('rnd_stats_min', 'Min')}: ${minVal} · ${t('rnd_stats_max', 'Max')}: ${maxVal}`;
        statsEl.hidden = false;
      } else {
        statsEl.hidden = true;
      }
    }

    if (hintEl) {
      hintEl.hidden = !isFinal;
    }
  }

  function renderHistory() {
    const list = $('#rnd-history');
    clearNode(list);
    const history = Store.state.random.history;
    if (!history.length) {
      list.append(h('li', { class: 'muted' }, t('rnd_empty', 'Zatím nic.')));
      return;
    }
    const loc = currentLang === 'ru' ? 'ru-RU' : (currentLang === 'en' ? 'en-US' : 'cs-CZ');
    for (const entry of history) {
      const nums = entry.numbers || [];
      const text = nums.map((n) => n.toLocaleString(loc)).join(', ');
      const copyBtn = h('button', {
        class: 'ghost-btn tiny',
        type: 'button',
        title: t('rnd_copy', 'Kopírovat'),
        onclick: () => copyText(nums.join(', ')),
      }, '📋');

      list.append(h('li', {},
        h('span', { class: 'history-nums' }, text),
        h('div', { class: 'row gap-sm' },
          h('time', { class: 'muted' }, `${entry.min}–${entry.max} · ${formatTime(entry.at)}`),
          copyBtn
        )
      ));
    }
  }

  function generate() {
    clearInterval(flickerTimer);
    flickerTimer = null;

    const { min, max, count } = readInputs();
    const unique = $('#rnd-unique').checked;
    const sort = $('#rnd-sort').checked;

    if (!Number.isFinite(min) || !Number.isFinite(max)) return setError(t('rnd_err_bounds', 'Zadej platná celá čísla „Od“ i „Do“.'));
    if (min > max) return setError(t('rnd_err_min_gt_max', 'Hodnota „Od“ musí být menší nebo rovna „Do“.'));
    if (!Number.isFinite(count) || count < 1 || count > 100) return setError(t('rnd_err_count', 'Počet čísel musí být 1 až 100.'));
    const span = max - min + 1;
    if (span > Number.MAX_SAFE_INTEGER) return setError(t('rnd_err_span', 'Rozsah je příliš velký.'));
    if (unique && span < count) {
      return setError(t('rnd_err_unique', `Bez opakování nelze vylosovat ${count} čísel z rozsahu o velikosti ${span}.`));
    }
    setError('');

    let result;
    try {
      result = draw(min, max, count, unique);
    } catch (err) {
      return setError(err.message || 'Chyba při generování.');
    }
    if (sort) result.sort((a, b) => a - b);
    lastResult = result;

    const state = Store.state.random;
    Object.assign(state, { min, max, count, unique, sort });
    state.history.unshift({ numbers: result, min, max, at: new Date().toISOString() });
    state.history = state.history.slice(0, HISTORY_LIMIT);
    Store.touch();
    renderHistory();

    if (prefersReducedMotion()) {
      renderNumbers(result, true);
      return;
    }

    const started = Date.now();
    flickerTimer = setInterval(() => {
      if (Date.now() - started >= FLICKER_MS) {
        clearInterval(flickerTimer);
        renderNumbers(result, true);
        return;
      }
      const preview = draw(min, max, count, unique);
      if (sort) preview.sort((a, b) => a - b);
      renderNumbers(preview, false);
    }, 60);
  }

  function syncFromState() {
    const state = Store.state.random;
    $('#rnd-min').value = state.min;
    $('#rnd-max').value = state.max;
    $('#rnd-count').value = state.count;
    $('#rnd-unique').checked = Boolean(state.unique);
    $('#rnd-sort').checked = Boolean(state.sort);
    setError('');

    if (state.history && state.history[0] && Array.isArray(state.history[0].numbers) && state.history[0].numbers.length) {
      lastResult = state.history[0].numbers;
      renderNumbers(lastResult, true);
    } else {
      lastResult = [];
      renderNumbers([], true);
    }
    renderHistory();
  }

  function init() {
    $('#rnd-go').addEventListener('click', generate);
    $('#rnd-copy').addEventListener('click', () => {
      if (!lastResult.length) return toast(t('rnd_nothing_to_copy', 'Není co kopírovat.'), 'warn');
      copyText(lastResult.join(', '));
    });
    $('#rnd-history-clear').addEventListener('click', () => {
      Store.state.random.history = [];
      renderHistory();
      Store.touch();
    });

    for (const id of ['#rnd-min', '#rnd-max', '#rnd-count', '#rnd-unique', '#rnd-sort']) {
      $(id).addEventListener('input', () => {
        setError('');
      });
      $(id).addEventListener('change', () => {
        const { min, max, count } = readInputs();
        if (Number.isFinite(min)) Store.state.random.min = min;
        if (Number.isFinite(max)) Store.state.random.max = max;
        if (Number.isFinite(count) && count >= 1 && count <= 100) Store.state.random.count = count;
        Store.state.random.unique = $('#rnd-unique').checked;
        Store.state.random.sort = $('#rnd-sort').checked;
        Store.touch();
      });
    }

    $$('.rnd-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const min = Number(btn.dataset.min);
        const max = Number(btn.dataset.max);
        const count = Number(btn.dataset.count);
        const unique = btn.dataset.unique === '1';

        $('#rnd-min').value = min;
        $('#rnd-max').value = max;
        $('#rnd-count').value = count;
        $('#rnd-unique').checked = unique;
        setError('');

        Object.assign(Store.state.random, { min, max, count, unique });
        Store.touch();
        generate();
      });
    });

    $('#panel-random').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && event.target.tagName === 'INPUT') {
        event.preventDefault();
        generate();
      }
    });

    registerTab('random', {
      activate: () => {},
      deactivate: () => {
        if (flickerTimer) clearInterval(flickerTimer);
      },
    });
  }

  return {
    init,
    syncFromState,
    refreshIfActive: () => {
      if (lastResult && lastResult.length) renderNumbers(lastResult, true);
      renderHistory();
    }
  };
})();

/* ==========================================================================
   Shared pack metadata
   ========================================================================== */

const PACK_CATEGORIES = [
  { id: 'expansion', label: 'Дополнения', labelCs: 'Rozšíření', labelEn: 'Expansion Packs', short: 'EP' },
  { id: 'gamepack', label: 'Игровые наборы', labelCs: 'Herní balíčky', labelEn: 'Game Packs', short: 'GP' },
  { id: 'stuffpack', label: 'Каталоги', labelCs: 'Kolekce', labelEn: 'Stuff Packs', short: 'SP' },
  { id: 'kit', label: 'Комплекты', labelCs: 'Výbava (Kity)', labelEn: 'Kits', short: 'Kit' },
];

const KIT_SUBTYPES = [
  { id: 'build', label: 'Stavební kity' },
  { id: 'cas', label: 'Vzhledové kity' },
  { id: 'other', label: 'Ostatní kity' },
];

const categoryLabel = (id) => {
  const cat = PACK_CATEGORIES.find((c) => c.id === id);
  if (!cat) return id;
  if (currentLang === 'cs') return cat.labelCs;
if (currentLang === 'en') return cat.labelEn;
  return cat.label;
};

/* ==========================================================================
   TAB: SimsMix Generator (1:1 with simsmix.ru/generator/)
   ========================================================================== */

const Simsmix = (() => {
  let doc = null;
  let active = false;

  function ownedOnly(list) {
    if (!list) return [];
    return list.filter((item) => !item.pack || isPackOwned(item.pack));
  }

  function getLocalizedText(obj, field = 'name') {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (currentLang === 'ru' && (obj.ru || obj.nameRu)) return obj.ru || obj.nameRu;
    if (currentLang === 'cs' && (obj.cs || obj.nameCs)) return obj.cs || obj.nameCs;
    if (currentLang === 'en' && (obj.en || obj.nameEn)) return obj.en || obj.nameEn;
    return obj.ru || obj.nameRu || obj[field] || obj.en || '';
  }

  function getLocalizedSub(obj) {
    if (!obj || typeof obj === 'string') return '';
    const main = getLocalizedText(obj);
    const en = obj.en || obj.nameEn;
    if (en && en !== main) return en;
    return '';
  }

  function ensureCurrent() {
    if (!Store.state.simsmix) Store.state.simsmix = {};
    if (!Store.state.simsmix.locks) Store.state.simsmix.locks = {};
    if (!Store.state.simsmix.current) Store.state.simsmix.current = {};
    if (!Store.state.simsmix.heredity) {
      Store.state.simsmix.heredity = { enabled: false, father: ['', '', ''], mother: ['', '', ''] };
    }
  }

  function isLocked(key) {
    ensureCurrent();
    return Boolean(Store.state.simsmix.locks[key]);
  }

  function setLock(key, val) {
    ensureCurrent();
    Store.state.simsmix.locks[key] = Boolean(val);
    Store.touch();
    updateLockUI(key);
  }

  function toggleLock(key) {
    setLock(key, !isLocked(key));
  }

  function updateLockUI(key) {
    const btn = $(`#simsmix-lock-${key}`);
    if (!btn) return;
    const locked = isLocked(key);
    btn.textContent = locked ? '🔒' : '🔓';
    btn.classList.toggle('locked', locked);
    btn.title = locked ? t('unlock', 'Разблокировать') : t('lock', 'Заблокировать');
  }

  function updateAllLocksUI() {
    const keys = [
      'gender', 'values', 'asp-child', 'asp-teen', 'asp-adult', 'aspirations',
      'career-teen', 'career-adult', 'careers',
      'trait-infant', 'trait-toddler', 'trait-1', 'trait-2', 'trait-3', 'traits'
    ];
    for (const k of keys) updateLockUI(k);
  }

  function rollGender(force = false) {
    ensureCurrent();
    if (!doc || !doc.sexes) return;
    if (!force && isLocked('gender') && Store.state.simsmix.current.gender) return;

    const checkedRadio = $('input[name="sm-gender"]:checked');
    const selectedOpt = checkedRadio ? checkedRadio.value : (Store.state.simsmix.genderOpt || 'random');
    let chosen;
    if (selectedOpt === 'male') chosen = doc.sexes.find((s) => s.id === 'male');
    else if (selectedOpt === 'female') chosen = doc.sexes.find((s) => s.id === 'female');
    else chosen = pickOne(doc.sexes);

    Store.state.simsmix.current.gender = chosen;
    Store.touch();
    renderGender();
  }

  function rollValues(force = false) {
    ensureCurrent();
    if (!doc || !doc.character_values) return;
    const currentVals = Store.state.simsmix.current.values || {};
    const lockAll = isLocked('values');
    const newVals = { ...currentVals };

    for (const val of doc.character_values) {
      if (!force && (lockAll || isLocked(`val-${val.id}`)) && currentVals[val.id]) continue;
      const select = $(`#sm-val-select-${val.id}`);
      const choice = select ? select.value : ((Store.state.simsmix.valuesOpts && Store.state.simsmix.valuesOpts[val.id]) || 'random');
      const states = ['positive', 'negative', 'neutral'];
      const chosenState = (choice === 'random' || !states.includes(choice)) ? pickOne(states) : choice;
      newVals[val.id] = {
        id: val.id,
        state: chosenState,
        nameRu: val.nameRu,
        nameCs: val.nameCs,
        nameEn: val.nameEn,
        text: val[chosenState],
      };
    }

    Store.state.simsmix.current.values = newVals;
    Store.touch();
    renderValues();
  }

  function rollAspirations(force = false) {
    ensureCurrent();
    if (!doc) return;
    const lockAll = isLocked('aspirations');
    const curr = Store.state.simsmix.current;

    if (force || (!lockAll && !isLocked('asp-child'))) {
      const pool = ownedOnly(doc.child_aspirations);
      if (pool.length) curr.aspChild = pickOne(pool);
    }
    if (force || (!lockAll && !isLocked('asp-teen'))) {
      const pool = ownedOnly(doc.teen_aspirations);
      if (pool.length) curr.aspTeen = pickOne(pool);
    }
    if (force || (!lockAll && !isLocked('asp-adult'))) {
      const pool = ownedOnly(doc.adult_aspirations);
      if (pool.length) curr.aspAdult = pickOne(pool);
    }

    Store.touch();
    renderAspirations();
  }

  function rollCareers(force = false) {
    ensureCurrent();
    if (!doc) return;
    const lockAll = isLocked('careers');
    const curr = Store.state.simsmix.current;

    if (force || (!lockAll && !isLocked('career-teen'))) {
      const pool = ownedOnly(doc.teen_careers);
      if (pool.length) curr.careerTeen = pickOne(pool);
    }
    if (force || (!lockAll && !isLocked('career-adult'))) {
      const pool = ownedOnly(doc.adult_careers);
      if (pool.length) {
        const pickedCareer = pickOne(pool);
        const branchCheck = $('#simsmix-career-branches');
        const includeBranches = branchCheck ? branchCheck.checked : Store.state.simsmix.careerBranches;
        let chosenBranch = null;
        if (includeBranches && Array.isArray(pickedCareer.branches) && pickedCareer.branches.length > 0) {
          chosenBranch = pickOne(pickedCareer.branches);
        }
        curr.careerAdult = {
          ...pickedCareer,
          chosenBranch,
        };
      }
    }

    Store.touch();
    renderCareers();
  }

  function rollTraits(force = false) {
    ensureCurrent();
    if (!doc) return;
    const lockAll = isLocked('traits');
    const curr = Store.state.simsmix.current;

    if (force || (!lockAll && !isLocked('trait-infant'))) {
      const pool = ownedOnly(doc.infant_traits);
      if (pool.length) curr.traitInfant = pickOne(pool);
    }

    if (force || (!lockAll && !isLocked('trait-toddler'))) {
      const pool = doc.toddler_traits;
      if (pool && pool.length) curr.traitToddler = pickOne(pool);
    }

    const pool = ownedOnly(doc.traits);
    if (!pool.length) return;

    const heredityCheck = $('#simsmix-heredity-enable');
    const heredityEnabled = heredityCheck ? heredityCheck.checked : Store.state.simsmix.heredity.enabled;
    const parentTraits = [];
    if (heredityEnabled) {
      for (let i = 1; i <= 3; i++) {
        const f = $(`#simsmix-father-${i}`);
        if (f && f.value) parentTraits.push(f.value);
        const m = $(`#simsmix-mother-${i}`);
        if (m && m.value) parentTraits.push(m.value);
      }
    }

    function pickNextTrait(childOnly, excludeNames) {
      const candidates = pool.filter((t) => !excludeNames.includes(t.en) && (!childOnly || t.childOk));
      if (!candidates.length) return pool[0];

      if (parentTraits.length > 0) {
        const parentMatches = candidates.filter((t) => parentTraits.includes(t.en));
        if (parentMatches.length > 0 && Math.random() < 0.6) {
          return pickOne(parentMatches);
        }
      }
      return pickOne(candidates);
    }

    const exclude = [];
    if (!force && (lockAll || isLocked('trait-1')) && curr.trait1) {
      exclude.push(curr.trait1.en);
    } else {
      curr.trait1 = pickNextTrait(true, exclude);
      if (curr.trait1) exclude.push(curr.trait1.en);
    }

    if (!force && (lockAll || isLocked('trait-2')) && curr.trait2) {
      exclude.push(curr.trait2.en);
    } else {
      curr.trait2 = pickNextTrait(false, exclude);
      if (curr.trait2) exclude.push(curr.trait2.en);
    }

    if (!force && (lockAll || isLocked('trait-3')) && curr.trait3) {
      exclude.push(curr.trait3.en);
    } else {
      curr.trait3 = pickNextTrait(false, exclude);
    }

    Store.touch();
    renderTraits();
  }

  function rollAll() {
    rollGender();
    rollValues();
    rollAspirations();
    rollCareers();
    rollTraits();
  }

  function renderGender() {
    ensureCurrent();
    const curr = Store.state.simsmix.current.gender;
    const out = $('#simsmix-out-gender');
    if (!out) return;
    if (!curr) {
      out.textContent = '—';
      out.className = 'simsmix-res-badge';
      return;
    }
    const label = getLocalizedText(curr);
    out.textContent = label;
    out.className = `simsmix-res-badge gender-badge ${curr.id}`;
  }

  function renderValues() {
    ensureCurrent();
    const container = $('#simsmix-values-list');
    if (!container || !doc || !doc.character_values) return;
    clearNode(container);

    const currVals = Store.state.simsmix.current.values || {};
    for (const val of doc.character_values) {
      const curr = currVals[val.id];
      const valState = curr ? curr.state : 'neutral';
      const stateBadgeClass = valState === 'positive' ? 'simsmix-val-pos' : (valState === 'negative' ? 'simsmix-val-neg' : 'simsmix-val-neu');
      const stateText = curr && curr.text ? getLocalizedText(curr.text) : '—';
      const currentChoice = (Store.state.simsmix.valuesOpts && Store.state.simsmix.valuesOpts[val.id]) || 'random';

      const select = h('select', {
        id: `sm-val-select-${val.id}`,
        class: 'simsmix-val-select',
        onchange: (e) => {
          if (!Store.state.simsmix.valuesOpts) Store.state.simsmix.valuesOpts = {};
          Store.state.simsmix.valuesOpts[val.id] = e.target.value;
          Store.touch();
        }
      },
        h('option', { value: 'random', selected: currentChoice === 'random' }, t('simsmix_val_rnd')),
        h('option', { value: 'positive', selected: currentChoice === 'positive' }, t('simsmix_val_pos')),
        h('option', { value: 'negative', selected: currentChoice === 'negative' }, t('simsmix_val_neg')),
        h('option', { value: 'neutral', selected: currentChoice === 'neutral' }, t('simsmix_val_neu'))
      );

      const lockKey = `val-${val.id}`;
      const locked = isLocked(lockKey);
      const lockBtn = h('button', {
        type: 'button',
        class: `lock-btn-mini${locked ? ' locked' : ''}`,
        title: locked ? t('unlock', 'Разблокировать') : t('lock', 'Заблокировать'),
        onclick: () => {
          toggleLock(lockKey);
          renderValues();
        }
      }, locked ? '🔒' : '🔓');

      const row = h('div', { class: 'simsmix-val-row' },
        h('div', { class: 'simsmix-val-header' },
          h('span', { class: 'simsmix-val-name' }, getLocalizedText(val, 'nameRu')),
          h('div', { style: 'display:flex;align-items:center;gap:6px;' }, select, lockBtn)
        ),
        h('div', { class: 'simsmix-val-out-row' },
          h('span', { class: `simsmix-val-badge ${stateBadgeClass}` }, stateText)
        )
      );

      container.append(row);
    }
  }

  function renderItemRow(containerId, item, options = {}) {
    const box = $(containerId);
    if (!box) return;
    clearNode(box);
    if (!item) {
      box.textContent = '—';
      return;
    }
    const title = getLocalizedText(item);
    const sub = getLocalizedSub(item);
    const elements = [h('div', { class: 'simsmix-item-title-row' },
      h('span', {}, title),
      sub ? h('span', { class: 'simsmix-item-sub' }, ` (${sub})`) : null
    )];

    if (options.branch) {
      const branchTitle = getLocalizedText(options.branch);
      const branchSub = getLocalizedSub(options.branch);
      elements.push(h('div', { class: 'simsmix-career-branch-row', style: 'font-size:.82rem;color:var(--accent);margin-top:2px;' },
        `↳ ${branchTitle}${branchSub ? ' (' + branchSub + ')' : ''}`
      ));
    }

    if (item.pack) {
      elements.push(h('div', { class: 'simsmix-item-pack' },
        packIconOf(item.pack) ? h('img', {
          class: 'pack-icon-mini',
          src: packIconUrl(packIconOf(item.pack)),
          alt: '',
          onerror: (e) => { e.target.style.display = 'none'; }
        }) : null,
        h('span', {}, packNameOf(item.pack))
      ));
    }

    for (const el of elements) box.append(el);
  }

  function renderAspirations() {
    ensureCurrent();
    const curr = Store.state.simsmix.current;
    renderItemRow('#simsmix-out-asp-child', curr.aspChild);
    renderItemRow('#simsmix-out-asp-teen', curr.aspTeen);
    renderItemRow('#simsmix-out-asp-adult', curr.aspAdult);
  }

  function renderCareers() {
    ensureCurrent();
    const curr = Store.state.simsmix.current;
    renderItemRow('#simsmix-out-career-teen', curr.careerTeen);
    renderItemRow('#simsmix-out-career-adult', curr.careerAdult, { branch: curr.careerAdult && curr.careerAdult.chosenBranch });
  }

  function renderTraits() {
    ensureCurrent();
    const curr = Store.state.simsmix.current;
    renderItemRow('#simsmix-out-trait-infant', curr.traitInfant);
    renderItemRow('#simsmix-out-trait-toddler', curr.traitToddler);
    renderItemRow('#simsmix-out-trait-1', curr.trait1);
    renderItemRow('#simsmix-out-trait-2', curr.trait2);
    renderItemRow('#simsmix-out-trait-3', curr.trait3);
  }

  function renderHereditySelects() {
    if (!doc || !doc.traits) return;
    const traits = doc.traits.slice().sort((a, b) => getLocalizedText(a).localeCompare(getLocalizedText(b)));
    const emptyLabel = t('simsmix_no_trait', '— Без черты —');

    for (let i = 1; i <= 3; i++) {
      const fSel = $(`#simsmix-father-${i}`);
      const mSel = $(`#simsmix-mother-${i}`);
      const fVal = (Store.state.simsmix.heredity.father && Store.state.simsmix.heredity.father[i - 1]) || '';
      const mVal = (Store.state.simsmix.heredity.mother && Store.state.simsmix.heredity.mother[i - 1]) || '';

      if (fSel) {
        clearNode(fSel);
        fSel.append(h('option', { value: '' }, emptyLabel));
        for (const t of traits) {
          fSel.append(h('option', { value: t.en, selected: t.en === fVal }, getLocalizedText(t)));
        }
      }
      if (mSel) {
        clearNode(mSel);
        mSel.append(h('option', { value: '' }, emptyLabel));
        for (const t of traits) {
          mSel.append(h('option', { value: t.en, selected: t.en === mVal }, getLocalizedText(t)));
        }
      }
    }
  }

  function copySummary() {
    ensureCurrent();
    const curr = Store.state.simsmix.current;
    if (!curr || !curr.gender) {
      toast(t('copy_failed_toast'), 'error');
      return;
    }

    const lines = [];
    lines.push(`🧬 SimsMix — ${t('tab_simsmix')}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`${t('simsmix_gender_title')}: ${getLocalizedText(curr.gender)}`);

    if (curr.values) {
      lines.push(`\n${t('simsmix_values_title')}:`);
      for (const val of Object.values(curr.values)) {
        lines.push(`• ${getLocalizedText(val, 'nameRu')}: ${getLocalizedText(val.text)} (${val.state === 'positive' ? '+' : (val.state === 'negative' ? '−' : '0')})`);
      }
    }

    lines.push(`\n${t('simsmix_aspirations_title')}:`);
    if (curr.aspChild) lines.push(`• ${t('stage_child')}: ${getLocalizedText(curr.aspChild)}`);
    if (curr.aspTeen) lines.push(`• ${t('stage_teen')}: ${getLocalizedText(curr.aspTeen)}`);
    if (curr.aspAdult) lines.push(`• ${t('stage_adult')}: ${getLocalizedText(curr.aspAdult)}`);

    lines.push(`\n${t('simsmix_careers_title')}:`);
    if (curr.careerTeen) lines.push(`• ${t('simsmix_career_teen_label')}: ${getLocalizedText(curr.careerTeen)}`);
    if (curr.careerAdult) {
      const branchText = curr.careerAdult.chosenBranch ? ` ↳ ${getLocalizedText(curr.careerAdult.chosenBranch)}` : '';
      lines.push(`• ${t('simsmix_career_adult_label')}: ${getLocalizedText(curr.careerAdult)}${branchText}`);
    }

    lines.push(`\n${t('simsmix_traits_title')}:`);
    if (curr.traitInfant) lines.push(`• ${t('stage_infant')}: ${getLocalizedText(curr.traitInfant)}`);
    if (curr.traitToddler) lines.push(`• ${t('stage_toddler')}: ${getLocalizedText(curr.traitToddler)}`);
    if (curr.trait1) lines.push(`• ${t('simsmix_trait_child_label')}: ${getLocalizedText(curr.trait1)}`);
    if (curr.trait2) lines.push(`• ${t('simsmix_trait_teen_label')}: ${getLocalizedText(curr.trait2)}`);
    if (curr.trait3) lines.push(`• ${t('simsmix_trait_adult_label')}: ${getLocalizedText(curr.trait3)}`);

    copyText(lines.join('\n'));
  }

  function syncFromState() {
    ensureCurrent();
    const sm = Store.state.simsmix;
    const r = $(`input[name="sm-gender"][value="${sm.genderOpt || 'random'}"]`);
    if (r) r.checked = true;

    const b = $('#simsmix-career-branches');
    if (b) b.checked = Boolean(sm.careerBranches !== false);

    const hCheck = $('#simsmix-heredity-enable');
    if (hCheck) hCheck.checked = Boolean(sm.heredity.enabled);

    const pi = $('#simsmix-pack-indicator');
    if (pi && packRegistry.size > 0) {
      const owned = Array.from(packRegistry.values()).filter((p) => isPackOwned(p.name)).length;
      pi.textContent = `${owned} / ${packRegistry.size} DLC`;
    }

    updateAllLocksUI();
    renderGender();
    renderValues();
    renderAspirations();
    renderCareers();
    renderTraits();
    renderHereditySelects();
  }

  async function activate() {
    active = true;
    if (doc) {
      syncFromState();
      return;
    }
    try {
      const [smDoc] = await Promise.all([
        loadData('simsmix'),
        ensurePacksLoaded()
      ]);
      doc = smDoc;
      hideTabError('simsmix-error');
      syncFromState();

      if (!Store.state.simsmix.current || !Store.state.simsmix.current.gender) {
        rollAll();
      }
    } catch (error) {
      showTabError('simsmix-error', `${error.message} Zkus stránku načíst znovu.`);
    }
  }

  function init() {
    $('#simsmix-gen-all').addEventListener('click', () => rollAll());
    $('#simsmix-copy-all').addEventListener('click', () => copySummary());
    $('#simsmix-reset-all').addEventListener('click', async () => {
      Store.state.simsmix.current = {};
      Store.state.simsmix.locks = {};
      Store.touch();
      updateAllLocksUI();
      rollAll();
    });

    $('#simsmix-gen-gender').addEventListener('click', () => rollGender(true));
    $('#simsmix-gen-values').addEventListener('click', () => rollValues(true));
    $('#simsmix-gen-aspirations').addEventListener('click', () => rollAspirations(true));
    $('#simsmix-gen-careers').addEventListener('click', () => rollCareers(true));
    $('#simsmix-gen-traits').addEventListener('click', () => rollTraits(true));

    $('#simsmix-lock-gender').addEventListener('click', () => toggleLock('gender'));
    $('#simsmix-lock-values').addEventListener('click', () => toggleLock('values'));
    $('#simsmix-lock-aspirations').addEventListener('click', () => toggleLock('aspirations'));
    $('#simsmix-lock-careers').addEventListener('click', () => toggleLock('careers'));
    $('#simsmix-lock-traits').addEventListener('click', () => toggleLock('traits'));

    $('#simsmix-lock-asp-child').addEventListener('click', () => toggleLock('asp-child'));
    $('#simsmix-lock-asp-teen').addEventListener('click', () => toggleLock('asp-teen'));
    $('#simsmix-lock-asp-adult').addEventListener('click', () => toggleLock('asp-adult'));
    $('#simsmix-lock-career-teen').addEventListener('click', () => toggleLock('career-teen'));
    $('#simsmix-lock-career-adult').addEventListener('click', () => toggleLock('career-adult'));
    $('#simsmix-lock-trait-infant').addEventListener('click', () => toggleLock('trait-infant'));
    $('#simsmix-lock-trait-toddler').addEventListener('click', () => toggleLock('trait-toddler'));
    $('#simsmix-lock-trait-1').addEventListener('click', () => toggleLock('trait-1'));
    $('#simsmix-lock-trait-2').addEventListener('click', () => toggleLock('trait-2'));
    $('#simsmix-lock-trait-3').addEventListener('click', () => toggleLock('trait-3'));

    $$('input[name="sm-gender"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        Store.state.simsmix.genderOpt = e.target.value;
        Store.touch();
      });
    });

    $('#simsmix-career-branches').addEventListener('change', (e) => {
      Store.state.simsmix.careerBranches = e.target.checked;
      Store.touch();
    });

    $('#simsmix-heredity-enable').addEventListener('change', (e) => {
      Store.state.simsmix.heredity.enabled = e.target.checked;
      Store.touch();
    });

    for (let i = 1; i <= 3; i++) {
      $(`#simsmix-father-${i}`).addEventListener('change', (e) => {
        if (!Store.state.simsmix.heredity.father) Store.state.simsmix.heredity.father = ['', '', ''];
        Store.state.simsmix.heredity.father[i - 1] = e.target.value;
        Store.touch();
      });
      $(`#simsmix-mother-${i}`).addEventListener('change', (e) => {
        if (!Store.state.simsmix.heredity.mother) Store.state.simsmix.heredity.mother = ['', '', ''];
        Store.state.simsmix.heredity.mother[i - 1] = e.target.value;
        Store.touch();
      });
    }

    registerTab('simsmix', { activate });
  }

  return {
    init,
    syncFromState: () => { if (doc) syncFromState(); },
    refreshIfActive: () => {
      if (active && doc) {
        renderGender();
        renderValues();
        renderAspirations();
        renderCareers();
        renderTraits();
        renderHereditySelects();
      }
    }
  };
})();

/* ==========================================================================
   TAB: Random Packs Generator (James Turner 1:1 style)
   ========================================================================== */

const RandomPacks = (() => {
  let packs = null;
  let active = false;
  let search = '';

  const weightOf = (categoryId) => {
    const weights = Store.state.packs.weights || {};
    const defaultWeights = { expansion: 30, gamepack: 30, stuffpack: 15, kit: 8 };
    return weights[categoryId] !== undefined ? Number(weights[categoryId]) : (defaultWeights[categoryId] || 1);
  };

  function ownedPacks() {
    if (!packs) return [];
    return packs.filter((pack) => isPackOwned(pack.name));
  }

  function setMessage(message, kind = 'hint') {
    const node = $('#rp-message');
    if (!node) return;
    node.textContent = message || '';
    node.className = kind === 'error' ? 'error-text' : 'hint';
  }

  function drawPacks() {
    const state = Store.state.packs;
    const count = clamp(Math.trunc(Number(state.count) || 3), 1, 20);
    const pool = ownedPacks().filter((pack) => weightOf(pack.category) > 0);

    if (!pool.length) {
      setMessage(t('rp_msg_no_active'), 'error');
      return null;
    }
    if (pool.length <= count) {
      setMessage(t('rp_msg_only_n_available').replace('{n}', pool.length));
      return shuffled(pool);
    }

    const activeCategories = [...new Set(pool.map((pack) => pack.category))];
    const picked = [];
    const remaining = pool.slice();

    const take = (candidates) => {
      const chosen = weightedPick(candidates, (pack) => weightOf(pack.category));
      if (!chosen) return false;
      picked.push(chosen);
      const index = remaining.indexOf(chosen);
      if (index >= 0) remaining.splice(index, 1);
      return true;
    };

    if (state.eachCategory) {
      const catsToPick = count >= activeCategories.length
        ? activeCategories
        : shuffled(activeCategories.slice()).slice(0, count);
      for (const category of catsToPick) {
        take(remaining.filter((pack) => pack.category === category));
      }
      setMessage('');
    } else {
      setMessage('');
    }

    while (picked.length < count && remaining.length) {
      if (!take(remaining)) break;
    }
    return shuffled(picked);
  }

  function renderResults() {
    const box = $('#rp-results');
    if (!box) return;
    clearNode(box);
    const results = Store.state.packs.results || [];
    if (!results.length) return;

    for (const item of results) {
      const pack = (packs && packs.find((p) => p.name === item.name || p.name === item)) || item;
      const title = packNameOf(pack.name);
      const subtitle = packSubNameOf(pack.name);

      box.append(h('div', { class: 'pack-card' },
        pack.icon ? h('img', {
          class: 'pack-card-icon',
          src: packIconUrl(pack.icon),
          alt: '',
          loading: 'lazy',
          onerror: (e) => { e.target.style.display = 'none'; },
        }) : null,
        h('div', { class: 'pack-card-info' },
          h('span', { class: `badge badge-${pack.category}` }, categoryLabel(pack.category)),
          h('span', { class: 'pack-name' }, title),
          subtitle ? h('span', { class: 'pack-sub-name' }, subtitle) : null
        )
      ));
    }
  }

  function renderWeights() {
    const box = $('#rp-weights');
    if (!box) return;
    clearNode(box);

    for (const category of PACK_CATEGORIES) {
      const value = weightOf(category.id);
      const output = h('output', { class: 'weight-value' }, String(value));
      const slider = h('input', {
        type: 'range', min: '0', max: '50', step: '1', value: String(value),
        'aria-label': `Вес ${categoryLabel(category.id)}`,
        oninput: (event) => {
          output.textContent = event.target.value;
          if (!Store.state.packs.weights) Store.state.packs.weights = {};
          Store.state.packs.weights[category.id] = Number(event.target.value);
          Store.touch();
        },
      });
      box.append(h('div', { class: 'weight-row' },
        h('span', { class: 'weight-label' }, categoryLabel(category.id)),
        slider,
        output
      ));
    }
  }

  function renderCategoriesTables() {
    const container = $('#rp-categories-container');
    if (!container || !packs) return;
    clearNode(container);

    const needle = search.trim().toLowerCase();
    let totalActive = 0;

    for (const category of PACK_CATEGORIES) {
      const catPacks = packs.filter((p) => p.category === category.id);
      const visiblePacks = catPacks.filter((p) => {
        if (!needle) return true;
        const nameRu = (p.nameRu || '').toLowerCase();
        const nameCs = (p.nameCs || '').toLowerCase();
        const nameEn = (p.name || '').toLowerCase();
        return nameRu.includes(needle) || nameCs.includes(needle) || nameEn.includes(needle);
      });

      const ownedInCat = catPacks.filter((p) => isPackOwned(p.name)).length;
      totalActive += ownedInCat;

      const catSection = h('div', { class: 'rp-cat-section' },
        h('div', { class: 'rp-cat-header' },
          h('div', { class: 'rp-cat-title-wrap' },
            h('span', { class: `badge badge-${category.id}` }, categoryLabel(category.id)),
            h('span', { class: 'pill' }, `${ownedInCat} / ${catPacks.length}`)
          ),
          h('div', { class: 'rp-cat-actions' },
            h('button', {
              type: 'button',
              class: 'ghost-btn small',
              onclick: () => {
                for (const p of catPacks) Store.state.packs.owned[p.name] = true;
                Store.touch();
                renderCategoriesTables();
                if (Supersim && Supersim.refreshIfActive) Supersim.refreshIfActive();
                if (Simsmix && Simsmix.refreshIfActive) Simsmix.refreshIfActive();
              }
            }, t('rp_select_all')),
            h('button', {
              type: 'button',
              class: 'ghost-btn small',
              onclick: () => {
                for (const p of catPacks) Store.state.packs.owned[p.name] = false;
                Store.touch();
                renderCategoriesTables();
                if (Supersim && Supersim.refreshIfActive) Supersim.refreshIfActive();
                if (Simsmix && Simsmix.refreshIfActive) Simsmix.refreshIfActive();
              }
            }, t('rp_deselect_all'))
          )
        )
      );

      const grid = h('div', { class: 'rp-pack-grid' });
      for (const pack of visiblePacks) {
        const owned = isPackOwned(pack.name);
        const checkbox = h('input', {
          type: 'checkbox',
          checked: owned,
          onchange: (e) => {
            Store.state.packs.owned[pack.name] = e.target.checked;
            Store.touch();
            renderCategoriesTables();
            if (Supersim && Supersim.refreshIfActive) Supersim.refreshIfActive();
            if (Simsmix && Simsmix.refreshIfActive) Simsmix.refreshIfActive();
          }
        });

        const card = h('label', { class: 'rp-pack-item' },
          checkbox,
          pack.icon ? h('img', {
            class: 'rp-pack-icon',
            src: packIconUrl(pack.icon),
            alt: '',
            loading: 'lazy',
            onerror: (e) => { e.target.style.display = 'none'; }
          }) : null,
          h('div', { class: 'rp-pack-texts' },
            h('span', { class: 'rp-pack-title', title: packNameOf(pack.name) }, packNameOf(pack.name)),
            packSubNameOf(pack.name) ? h('span', { class: 'rp-pack-subtitle' }, packSubNameOf(pack.name)) : null
          )
        );
        grid.append(card);
      }

      catSection.append(grid);
      container.append(catSection);
    }

    const totalPill = $('#rp-total-owned');
    if (totalPill) totalPill.textContent = `${totalActive} / ${packs.length}`;
  }

  function syncFromState() {
    if (!packs) return;
    const state = Store.state.packs;
    if (!state.weights || typeof state.weights !== 'object') {
      state.weights = { expansion: 30, gamepack: 30, stuffpack: 15, kit: 8 };
    }
    const countInput = $('#rp-count');
    if (countInput) countInput.value = state.count || 3;
    const eachCat = $('#rp-each-cat');
    if (eachCat) eachCat.checked = Boolean(state.eachCategory);

    renderWeights();
    renderResults();
    renderCategoriesTables();
  }

  async function activate() {
    active = true;
    if (packs) {
      syncFromState();
      return;
    }
    try {
      const doc = await loadData('packs');
      packs = doc.packs;
      hideTabError('randompacks-error');
      syncFromState();
    } catch (error) {
      showTabError('randompacks-error', `${error.message} Zkus načíst stránku znovu.`);
    }
  }

  function init() {
    $('#rp-count').addEventListener('input', (event) => {
      Store.state.packs.count = clamp(Math.trunc(Number(event.target.value) || 1), 1, 20);
      Store.touch();
    });

    $('#rp-each-cat').addEventListener('change', (event) => {
      Store.state.packs.eachCategory = event.target.checked;
      if (event.target.checked) {
        const pool = ownedPacks().filter((pack) => weightOf(pack.category) > 0);
        const activeCategories = [...new Set(pool.map((pack) => pack.category))];
        const currentCount = Number($('#rp-count').value) || 0;
        if (activeCategories.length > 0 && currentCount < activeCategories.length) {
          Store.state.packs.count = activeCategories.length;
          $('#rp-count').value = activeCategories.length;
        }
      }
      Store.touch();
    });

    $('#rp-go').addEventListener('click', () => {
      const results = drawPacks();
      if (!results) return;
      Store.state.packs.results = results;
      Store.touch();
      renderResults();
    });

    $('#rp-copy').addEventListener('click', () => {
      const results = Store.state.packs.results || [];
      if (!results.length) return toast(t('copy_failed_toast'), 'error');
      const lines = results.map((pack) => {
        const title = packNameOf(pack.name);
        const sub = packSubNameOf(pack.name);
        return `• [${categoryLabel(pack.category)}] ${title}${sub ? ' (' + sub + ')' : ''}`;
      });
      copyText(lines.join('\n'));
    });

    $('#rp-search').addEventListener('input', (event) => {
      search = event.target.value;
      renderCategoriesTables();
    });

    $('#rp-all-on').addEventListener('click', () => {
      if (!packs) return;
      for (const p of packs) Store.state.packs.owned[p.name] = true;
      Store.touch();
      renderCategoriesTables();
      if (Supersim && Supersim.refreshIfActive) Supersim.refreshIfActive();
      if (Simsmix && Simsmix.refreshIfActive) Simsmix.refreshIfActive();
    });

    $('#rp-all-off').addEventListener('click', () => {
      if (!packs) return;
      for (const p of packs) Store.state.packs.owned[p.name] = false;
      Store.touch();
      renderCategoriesTables();
      if (Supersim && Supersim.refreshIfActive) Supersim.refreshIfActive();
      if (Simsmix && Simsmix.refreshIfActive) Simsmix.refreshIfActive();
    });

    registerTab('randompacks', { activate });
  }

  return {
    init,
    syncFromState: () => { if (packs) syncFromState(); },
    refreshIfActive: () => {
      if (active && packs) {
        renderWeights();
        renderResults();
        renderCategoriesTables();
      }
    }
  };
})();

/* ==========================================================================
   TAB 5 — Super Sim tracker
   ========================================================================== */

const SUPERSIM_CATEGORIES = {
  'Kreativita': { ru: 'Творчество', cs: 'Kreativita', en: 'Creativity' },
  'Atletika': { ru: 'Спорт', cs: 'Atletika', en: 'Athletic' },
  'Nepravost': { ru: 'Дурной нрав', cs: 'Nepravost', en: 'Deviance' },
  'Rodina': { ru: 'Семья', cs: 'Rodina', en: 'Family' },
  'Jídlo': { ru: 'Еда', cs: 'Jídlo', en: 'Food' },
  'Bohatství': { ru: 'Состояние', cs: 'Bohatství', en: 'Fortune' },
  'Vědomosti': { ru: 'Знания', cs: 'Vědomosti', en: 'Knowledge' },
  'Láska': { ru: 'Любовь', cs: 'Láska', en: 'Love' },
  'Příroda': { ru: 'Природа', cs: 'Příroda', en: 'Nature' },
  'Popularita': { ru: 'Популярность', cs: 'Popularita', en: 'Popularity' },
  'Umístění a kultura': { ru: 'Место и культура', cs: 'Umístění a kultura', en: 'Location & Culture' },
  'Vlkodlaci': { ru: 'Оборотни', cs: 'Vlkodlaci', en: 'Werewolves' },
  'Teenagerské': { ru: 'Подростковые', cs: 'Teenagerské', en: 'Teen' },
  'Dětské': { ru: 'Детские', cs: 'Dětské', en: 'Child' },
  'Dospělé dovednosti': { ru: 'Взрослые навыки', cs: 'Dospělé dovednosti', en: 'Adult Skills' },
  'Dětské dovednosti': { ru: 'Детские навыки', cs: 'Dětské dovednosti', en: 'Child Skills' },
  'Batolecí dovednosti': { ru: 'Навыки малышей', cs: 'Batolecí dovednosti', en: 'Toddler Skills' },
  'Dospělé kariéry': { ru: 'Взрослые карьеры', cs: 'Dospělé kariéry', en: 'Adult Careers' },
  'Brigády (Teenager)': { ru: 'Подработки (подросток)', cs: 'Brigády (Teenager)', en: 'Part-time Jobs (Teen)' },
  'Hodnost': { ru: 'Ранг', cs: 'Hodnost', en: 'Rank' },
  'Praktická magie': { ru: 'Практическая магия', cs: 'Praktická magie', en: 'Practical Magic' },
  'Škodolibá magie': { ru: 'Проказливая магия', cs: 'Škodolibá magie', en: 'Mischief Magic' },
  'Nezkrotná magie': { ru: 'Неукротимая магия', cs: 'Nezkrotná magie', en: 'Untamed Magic' },
  'Lektvary': { ru: 'Зелья', cs: 'Lektvary', en: 'Potions' },
  'Batolecí milníky': { ru: 'Рубежи малышей', cs: 'Batolecí milníky', en: 'Toddler Milestones' },
  'Dětské milníky': { ru: 'Детские рубежи', cs: 'Dětské milníky', en: 'Child Milestones' },
  'Teenagerské milníky': { ru: 'Подростковые рубежи', cs: 'Teenagerské milníky', en: 'Teen Milestones' },
  'Dospělé milníky': { ru: 'Взрослые рубежи', cs: 'Dospělé milníky', en: 'Adult Milestones' },
  'animal': { ru: 'Животные', cs: 'Zvířata', en: 'Animal' },
  'athletic': { ru: 'Спорт', cs: 'Atletika', en: 'Athletic' },
  'child': { ru: 'Детские', cs: 'Dětské', en: 'Child' },
  'creativity': { ru: 'Творчество', cs: 'Kreativita', en: 'Creativity' },
  'deviance': { ru: 'Дурной нрав', cs: 'Nepravost', en: 'Deviance' },
  'family': { ru: 'Семья', cs: 'Rodina', en: 'Family' },
  'food': { ru: 'Еда', cs: 'Jídlo', en: 'Food' },
  'fortune': { ru: 'Состояние', cs: 'Bohatství', en: 'Fortune' },
  'knowledge': { ru: 'Знания', cs: 'Vědomosti', en: 'Knowledge' },
  'location': { ru: 'Место и культура', cs: 'Místo a kultura', en: 'Location' },
  'love': { ru: 'Любовь', cs: 'Láska', en: 'Love' },
  'nature': { ru: 'Природа', cs: 'Příroda', en: 'Nature' },
  'popularity': { ru: 'Популярность', cs: 'Popularita', en: 'Popularity' },
  'star wars': { ru: 'Star Wars', cs: 'Star Wars', en: 'Star Wars' },
  'teen': { ru: 'Подростковые', cs: 'Teenagerské', en: 'Teen' },
  'wellness': { ru: 'Здоровый образ жизни', cs: 'Wellness', en: 'Wellness' },
  'werewolf': { ru: 'Оборотни', cs: 'Vlkodlaci', en: 'Werewolf' },
  'fairy': { ru: 'Феи', cs: 'Víly', en: 'Fairy' },
};

const ASPIRATION_CATEGORY_DEFS = [
  { id: 'animal', name: { ru: 'Животные', cs: 'Zvířata', en: 'Animal' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -2, iy: -2, iw: 96, ih: 96 },
  { id: 'athletic', name: { ru: 'Спорт', cs: 'Atletika', en: 'Athletic' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -102, iy: -2, iw: 96, ih: 96 },
  { id: 'child', name: { ru: 'Детские', cs: 'Dětské', en: 'Child' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -202, iy: -2, iw: 96, ih: 96 },
  { id: 'creativity', name: { ru: 'Творчество', cs: 'Kreativita', en: 'Creativity' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -302, iy: -2, iw: 96, ih: 96 },
  { id: 'deviance', name: { ru: 'Дурной нрав', cs: 'Nepravost', en: 'Deviance' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -402, iy: -2, iw: 96, ih: 96 },
  { id: 'family', name: { ru: 'Семья', cs: 'Rodina', en: 'Family' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -2, iy: -102, iw: 96, ih: 96 },
  { id: 'food', name: { ru: 'Еда', cs: 'Jídlo', en: 'Food' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -102, iy: -102, iw: 96, ih: 96 },
  { id: 'fortune', name: { ru: 'Состояние', cs: 'Bohatství', en: 'Fortune' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -202, iy: -102, iw: 96, ih: 96 },
  { id: 'knowledge', name: { ru: 'Знания', cs: 'Vědomosti', en: 'Knowledge' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -302, iy: -102, iw: 96, ih: 96 },
  { id: 'location', name: { ru: 'Место и культура', cs: 'Místo a kultura', en: 'Location' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -402, iy: -102, iw: 96, ih: 96 },
  { id: 'love', name: { ru: 'Любовь', cs: 'Láska', en: 'Love' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -2, iy: -202, iw: 96, ih: 96 },
  { id: 'nature', name: { ru: 'Природа', cs: 'Příroda', en: 'Nature' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -102, iy: -202, iw: 96, ih: 96 },
  { id: 'popularity', name: { ru: 'Популярность', cs: 'Popularita', en: 'Popularity' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -202, iy: -202, iw: 96, ih: 96 },
  { id: 'star wars', name: { ru: 'Star Wars', cs: 'Star Wars', en: 'Star Wars' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -302, iy: -202, iw: 96, ih: 96 },
  { id: 'teen', name: { ru: 'Подростковые', cs: 'Teenagerské', en: 'Teen' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -402, iy: -202, iw: 96, ih: 96 },
  { id: 'wellness', name: { ru: 'Здоровый образ жизни', cs: 'Wellness', en: 'Wellness' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -2, iy: -302, iw: 96, ih: 96 },
  { id: 'werewolf', name: { ru: 'Оборотни', cs: 'Vlkodlaci', en: 'Werewolf' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -102, iy: -302, iw: 96, ih: 96 },
  { id: 'fairy', name: { ru: 'Феи', cs: 'Víly', en: 'Fairy' }, atlas: 'icons/supersim/a24dcbe0-53fe-4efb-6139-290b748d8900.png', aw: 500, ah: 400, ix: -202, iy: -302, iw: 96, ih: 96 },
];

const SUPERSIM_SECTION_EN = {
  aspirations: 'Aspirations',
  reward_traits: 'Reward Traits',
  skills: 'Skills',
  careers: 'Careers',
  degrees: 'University Degrees',
  vampire_powers: 'Vampire Powers',
  spellcaster: 'Spellcaster Abilities',
  fame_perks: 'Fame Perks',
  werewolf_abilities: 'Werewolf Abilities',
  ghost_mastery: 'Ghost Mastery',
  milestones: 'Milestones',
};

const Supersim = (() => {
  let doc = null;
  let search = '';
  let active = false;
  let selectedAspirationCat = '';
  let longPressTimer = null;
  let longPressFired = false;
  const sectionPills = new Map();
  const sectionRowStats = new Map();

  const keyOf = (sectionId, item) => `${sectionId}::${item.name}`;

  function sectionLabelOf(section) {
    if (currentLang === 'ru') return section.labelRu || section.label;
    if (currentLang === 'en') return section.labelEn || SUPERSIM_SECTION_EN[section.id] || section.label;
    return section.label;
  }

  function sectionNoteOf(section) {
    if (currentLang === 'ru') return section.noteRu || section.note;
    if (currentLang === 'en') return section.noteEn || section.note;
    return section.note;
  }

  function categoryTitleOf(cat) {
    if (!cat) return '';
    const item = SUPERSIM_CATEGORIES[cat];
    if (!item) return cat;
    return item[currentLang] || item.ru || cat;
  }

  function itemTitleOf(item) {
    if (currentLang === 'ru') return item.ru || item.name;
    if (currentLang === 'en') return item.en || item.name;
    return item.cs || item.name;
  }

  function itemSubOf(item) {
    const title = itemTitleOf(item);
    if (currentLang === 'en') return '';
    if (item.en && item.en !== title) return ` (${item.en})`;
    return '';
  }

  function progressOf(sectionId, item) {
    const value = Store.state.supersim.progress[keyOf(sectionId, item)];
    return clamp(Math.trunc(Number(value) || 0), 0, item.levels);
  }

  function setProgress(sectionId, item, value) {
    const key = keyOf(sectionId, item);
    const next = clamp(Math.trunc(value), 0, item.levels);
    if (next === 0) delete Store.state.supersim.progress[key];
    else Store.state.supersim.progress[key] = next;
    Store.touch();
  }

  /* Items from packs the profile does not own never appear anywhere. */
  const availableItems = (section) => section.items.filter((item) => !item.pack || isPackOwned(item.pack));

  function visibleItems(section) {
    const state = Store.state.supersim;
    const needle = search.trim().toLowerCase();
    return availableItems(section).filter((item) => {
      if (needle) {
        const matchName = item.name && item.name.toLowerCase().includes(needle);
        const matchEn = item.en && item.en.toLowerCase().includes(needle);
        const matchRu = item.ru && item.ru.toLowerCase().includes(needle);
        const matchCs = item.cs && item.cs.toLowerCase().includes(needle);
        if (!matchName && !matchEn && !matchRu && !matchCs) return false;
      }
      if (section.id === 'aspirations' && selectedAspirationCat) {
        if (item.category !== selectedAspirationCat) return false;
      }
      if (state.age) {
        if (state.age === 'toddler') {
          if (item.age !== 'toddler') return false;
        } else if (state.age === 'child') {
          if (item.age !== 'child') return false;
        } else if (state.age === 'teen') {
          if (item.age === 'toddler' || item.age === 'child' || item.age === 'adult') return false;
        } else if (state.age === 'adult') {
          if (item.age === 'toddler' || item.age === 'child' || item.age === 'teen') return false;
        }
      }
      if (state.hideDone && progressOf(section.id, item) >= item.levels) return false;
      return true;
    });
  }

  function sectionStats(section) {
    let done = 0;
    let total = 0;
    for (const item of availableItems(section)) {
      done += progressOf(section.id, item);
      total += item.levels;
    }
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function renderSummary() {
    let done = 0;
    let total = 0;
    for (const section of doc.sections) {
      const stats = sectionStats(section);
      done += stats.done;
      total += stats.total;
    }
    const percent = total ? Math.round((done / total) * 100) : 0;
    $('#supersim-summary-text').textContent = `${done} / ${total} · ${percent} %`;
    $('#supersim-summary-bar').style.width = `${percent}%`;
  }

  /* A click only touches its own card: rebuilding every section would scroll
     the list around and drop keyboard focus. */
  function applyChange(section, item, node, delta) {
    setProgress(section.id, item, progressOf(section.id, item) + delta);
    const hadFocus = document.activeElement === node;
    if (Store.state.supersim.hideDone && progressOf(section.id, item) >= item.levels) {
      node.remove();
    } else {
      const fresh = itemControl(section, item);
      node.replaceWith(fresh);
      if (hadFocus) fresh.focus();
    }
    const pill = sectionPills.get(section.id);
    if (pill) {
      const stats = sectionStats(section);
      pill.textContent = `${stats.done}/${stats.total} · ${stats.percent} %`;
    }
    const rowStats = sectionRowStats.get(section.id);
    if (rowStats) {
      const stats = sectionStats(section);
      rowStats.textContent = `${currentLang === 'ru' ? 'Выполнено:' : (currentLang === 'en' ? 'Completed:' : 'Dokončeno:')} ${stats.done} / ${stats.total} (${stats.percent}%)`;
    }
    renderSummary();
  }

  function renderAspirationTabs() {
    const tabsWrap = h('div', { class: 'aspiration_tabs_wrap' });

    // All Tab
    const allTab = h('button', {
      type: 'button',
      class: `aspiration_tab${!selectedAspirationCat ? ' active' : ''}`,
      onclick: () => {
        selectedAspirationCat = '';
        render();
      }
    },
    h('div', { style: 'height:36px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;' }, '★'),
    h('div', { class: 'aspiration_name' }, currentLang === 'ru' ? 'Все' : (currentLang === 'en' ? 'All' : 'Vše')));
    tabsWrap.append(allTab);

    for (const cat of ASPIRATION_CATEGORY_DEFS) {
      const isActive = selectedAspirationCat === cat.id;
      const style = [
        `--atlas:url('${cat.atlas}')`,
        `--atlas-w:${cat.aw}`,
        `--atlas-h:${cat.ah}`,
        `--icon-x:${cat.ix}`,
        `--icon-y:${cat.iy}`,
        `--icon-w:${cat.iw}`,
        `--icon-h:${cat.ih}`,
        `--icon-size:36px`,
      ].join(';');

      const tab = h('button', {
        type: 'button',
        class: `aspiration_tab${isActive ? ' active' : ''}`,
        onclick: () => {
          selectedAspirationCat = (selectedAspirationCat === cat.id) ? '' : cat.id;
          render();
        }
      },
      h('div', { class: 'icon-item inline', style }),
      h('div', { class: 'aspiration_name' }, cat.name[currentLang] || cat.name.ru || cat.id));
      tabsWrap.append(tab);
    }
    return tabsWrap;
  }

  function itemControl(section, item) {
    const value = progressOf(section.id, item);
    const done = value >= item.levels;
    const change = (delta) => applyChange(section, item, card, delta);
    const title = itemTitleOf(item);
    const sub = itemSubOf(item);

    let stateDesc = '';
    if (item.levels === 1) {
      if (currentLang === 'ru') stateDesc = done ? 'выполнено' : 'не выполнено';
      else if (currentLang === 'en') stateDesc = done ? 'completed' : 'incomplete';
      else stateDesc = done ? 'hotovo' : 'nehotovo';
    } else {
      if (currentLang === 'ru') stateDesc = `уровень ${value} из ${item.levels}`;
      else if (currentLang === 'en') stateDesc = `level ${value} of ${item.levels}`;
      else stateDesc = `úroveň ${value} z ${item.levels}`;
    }
    const labelText = `${title}${sub} – ${stateDesc}`;

    const iconSize = section.id === 'milestones' ? '38px' : '44px';
    let iconEl;
    if (item.atlas) {
      const style = [
        `--atlas:url('${item.atlas}')`,
        `--atlas-w:${item.aw}`,
        `--atlas-h:${item.ah}`,
        `--icon-x:${item.ix}`,
        `--icon-y:${item.iy}`,
        `--icon-w:${item.iw}`,
        `--icon-h:${item.ih}`,
        `--icon-size:${iconSize}`,
      ].join(';');
      iconEl = h('div', { class: 'icon-item inline', style, title });
    } else if (item.pack && packIconOf(item.pack)) {
      iconEl = h('img', {
        class: 'pack-icon-mini',
        src: packIconUrl(packIconOf(item.pack)),
        alt: '',
        style: `width:${iconSize};height:${iconSize};object-fit:contain;`
      });
    } else {
      iconEl = h('div', { class: 'icon-item inline', style: `--icon-size:${iconSize};` });
    }

    const iconContainer = section.id === 'milestones'
      ? h('div', { class: 'milestone_circle_cont' }, iconEl)
      : h('div', { class: 'supersim-card-icon' }, iconEl);

    const metaParts = [];
    if (item.cost) {
      const formatted = item.cost.toLocaleString(currentLang === 'ru' ? 'ru-RU' : (currentLang === 'en' ? 'en-US' : 'cs-CZ'));
      const unit = currentLang === 'ru' ? 'б.' : (currentLang === 'en' ? 'pts' : 'b.');
      metaParts.push(h('span', { class: 'reward_cost' },
        h('span', { 'aria-hidden': 'true' }, '💎'),
        `${formatted} ${unit}`
      ));
    }
    if (item.pack) {
      const pIcon = packIconOf(item.pack);
      metaParts.push(h('span', { class: 'item-pack-label', style: 'display:inline-flex;align-items:center;gap:4px;' },
        pIcon ? h('img', {
          class: 'pack-icon-mini',
          src: packIconUrl(pIcon),
          alt: '',
          loading: 'lazy',
          onerror: (e) => { e.target.style.display = 'none'; },
        }) : null,
        h('span', {}, packNameOf(item.pack) || item.pack)
      ));
    }
    if (item.levels > 1) {
      metaParts.push(h('div', { class: 'skill_bar_container' },
        h('div', { class: 'skill_progress', style: `width:${Math.round((value / item.levels) * 100)}%` })
      ));
    }

    let badgeText = '';
    if (item.levels === 1) {
      badgeText = done ? '✓' : '';
    } else {
      badgeText = done ? '✓' : String(value);
    }
    const levelBadge = h('span', { class: 'supersim-level-badge' }, badgeText);

    const card = h('button', {
      type: 'button',
      class: `supersim-card${done ? ' done' : ''}`,
      'aria-pressed': item.levels === 1 ? String(done) : null,
      'aria-label': labelText,
      onclick: () => {
        if (longPressFired) { longPressFired = false; return; }
        change(item.levels === 1 ? (done ? -1 : 1) : 1);
      },
      oncontextmenu: (event) => {
        event.preventDefault();
        change(-1);
      },
      onpointerdown: () => {
        longPressFired = false;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          longPressFired = true;
          change(-1);
        }, 550);
      },
      onpointerup: () => clearTimeout(longPressTimer),
      onpointerleave: () => clearTimeout(longPressTimer),
      onkeydown: (event) => {
        if (event.key === 'ArrowDown' || event.key === '-') {
          event.preventDefault();
          change(-1);
        }
        if (event.key === 'ArrowUp' || event.key === '+') {
          event.preventDefault();
          change(1);
        }
      },
    },
    iconContainer,
    h('div', { class: 'supersim-card-body' },
      h('span', { class: 'supersim-card-title' },
        title,
        sub ? h('span', { class: 'muted', style: 'font-weight:normal;font-size:.8em;margin-left:4px;' }, sub) : null
      ),
      metaParts.length ? h('div', { class: 'supersim-card-meta' }, metaParts) : null
    ),
    levelBadge);

    return card;
  }

  function renderSection(section) {
    const stats = sectionStats(section);
    const collapsed = Boolean(Store.state.supersim.collapsed[section.id]);
    const items = visibleItems(section);
    const bodyId = `section-body-${section.id}`;
    const pill = h('span', { class: 'pill' }, `${stats.done}/${stats.total} · ${stats.percent} %`);
    sectionPills.set(section.id, pill);

    const sLabel = sectionLabelOf(section);
    const sNote = sectionNoteOf(section);
    const resetText = t('supersim_reset_section');

    const titleBar = h('div', {
      class: 'sims_title',
      role: 'button',
      tabindex: 0,
      'aria-expanded': String(!collapsed),
      'aria-controls': bodyId,
      onclick: () => {
        Store.state.supersim.collapsed[section.id] = !collapsed;
        Store.touch();
        render();
      },
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          Store.state.supersim.collapsed[section.id] = !collapsed;
          Store.touch();
          render();
        }
      }
    },
    h('span', { class: 'sims_title_text' }, sLabel),
    h('div', { style: 'display:flex;align-items:center;gap:10px;' },
      pill,
      h('span', { class: 'minimize', 'aria-hidden': 'true' }, collapsed ? '▸' : '▾')
    ));

    const rowStatsEl = h('span', { class: 'row_bar_stats' }, `${currentLang === 'ru' ? 'Выполнено:' : (currentLang === 'en' ? 'Completed:' : 'Dokončeno:')} ${stats.done} / ${stats.total} (${stats.percent}%)`);
    sectionRowStats.set(section.id, rowStatsEl);

    const rowBar = h('div', { class: 'row_bar' },
      rowStatsEl,
      h('button', {
        type: 'button',
        class: 'ghost-btn small danger',
        onclick: async (e) => {
          e.stopPropagation();
          const msg = currentLang === 'ru'
            ? `Действительно сбросить прогресс в разделе «${sLabel}»?`
            : (currentLang === 'en' ? `Really reset progress in "${sLabel}"?` : `Opravdu vynulovat postup v sekci „${sLabel}“?`);
          const ok = await confirmDialog(resetText, msg, resetText);
          if (!ok) return;
          for (const item of section.items) delete Store.state.supersim.progress[keyOf(section.id, item)];
          Store.touch();
          render();
        },
      }, resetText)
    );

    const body = h('div', { class: 'section-body', id: bodyId, hidden: collapsed });

    if (section.incomplete) {
      body.append(h('p', { class: 'note' }, sNote || (currentLang === 'ru' ? 'Список в этом разделе пока не полон.' : (currentLang === 'en' ? 'The list in this section is not complete yet.' : 'Seznam v této sekci zatím není kompletní.'))));
    } else if (sNote) {
      body.append(h('p', { class: 'note' }, sNote));
    }

    if (section.id === 'aspirations') {
      body.append(renderAspirationTabs());
    }

    if (!items.length) {
      const emptyMsg = availableItems(section).length
        ? (currentLang === 'ru' ? 'Фильтрам ничего не соответствует.' : (currentLang === 'en' ? 'No items match the filters.' : 'Filtrům nic neodpovídá.'))
        : (currentLang === 'ru' ? 'Здесь пока нет элементов.' : (currentLang === 'en' ? 'No items here yet.' : 'Zatím tu nejsou žádné položky.'));
      body.append(h('p', { class: 'muted', style: 'padding:16px;' }, emptyMsg));
    } else if (section.groupBy === 'category' && section.id !== 'aspirations') {
      const groups = new Map();
      for (const item of items) {
        if (!groups.has(item.category)) groups.set(item.category, []);
        groups.get(item.category).push(item);
      }
      for (const [category, groupItems] of groups) {
        body.append(h('div', { class: 'group' },
          h('h4', { class: 'group-title', style: 'padding:12px 18px 4px;' }, categoryTitleOf(category)),
          h('div', { class: 'supersim-grid' }, groupItems.map((item) => itemControl(section, item)))));
      }
    } else {
      body.append(h('div', { class: 'supersim-grid' }, items.map((item) => itemControl(section, item))));
    }

    return h('section', { class: 'card tracker-section' }, titleBar, rowBar, body);
  }

  function render() {
    if (!doc) return;
    const box = $('#supersim-sections');
    clearNode(box);
    sectionPills.clear();
    sectionRowStats.clear();
    const state = Store.state.supersim;
    for (const section of doc.sections) {
      // While searching or filtering by age, sections with no hit only add noise.
      if ((state.age || search.trim()) && !visibleItems(section).length) continue;
      box.append(renderSection(section));
    }
    renderSummary();
  }

  function syncFromState() {
    if (!doc) return;
    const state = Store.state.supersim;
    if (!state.progress || typeof state.progress !== 'object') state.progress = {};
    if (!state.collapsed || typeof state.collapsed !== 'object') state.collapsed = {};
    $('#supersim-hide-done').checked = Boolean(state.hideDone);
    $('#supersim-age').value = state.age || '';
    $('#supersim-search').value = search;
    render();
  }

  async function activate() {
    active = true;
    if (doc) { syncFromState(); return; }
    try {
      const [superDoc] = await Promise.all([
        loadData('supersim'),
        ensurePacksLoaded(),
      ]);
      doc = superDoc;
      hideTabError('supersim-error');
      syncFromState();
    } catch (error) {
      showTabError('supersim-error', `${error.message} ${currentLang === 'ru' ? 'Попробуйте перезагрузить страницу.' : (currentLang === 'en' ? 'Try reloading the page.' : 'Zkus stránku načíst znovu.')}`);
    }
  }

  function init() {
    $('#supersim-search').addEventListener('input', (event) => {
      search = event.target.value;
      render();
    });
    $('#supersim-age').addEventListener('change', (event) => {
      Store.state.supersim.age = event.target.value;
      Store.touch();
      render();
    });
    $('#supersim-hide-done').addEventListener('change', (event) => {
      Store.state.supersim.hideDone = event.target.checked;
      Store.touch();
      render();
    });
    $('#supersim-reset-all').addEventListener('click', async () => {
      const title = t('supersim_reset_all');
      const msg = currentLang === 'ru'
        ? 'Действительно сбросить весь прогресс Суперсима? Это действие нельзя отменить.'
        : (currentLang === 'en' ? 'Really reset all Super Sim progress? This cannot be undone.' : 'Opravdu smazat celý postup Super Sima? Tohle nejde vrátit.');
      const ok = await confirmDialog(title, msg, title);
      if (!ok) return;
      Store.state.supersim.progress = {};
      Store.touch();
      render();
      toast(currentLang === 'ru' ? 'Прогресс сброшен.' : (currentLang === 'en' ? 'Progress reset.' : 'Postup vynulovaný.'), 'ok');
    });
    registerTab('supersim', { activate });
  }

  return {
    init,
    syncFromState: () => { if (doc) syncFromState(); },
    refreshIfActive: () => { if (active && doc) render(); },
  };
})();

/* ==========================================================================
   Boot
   ========================================================================== */

function initProfileBar() {
  $('#profile-select').addEventListener('change', (event) => {
    Store.selectProfile(Number(event.target.value));
  });
  $('#profile-manage').addEventListener('click', manageProfilesFlow);
  $('#save-retry').addEventListener('click', () => {
    Store.dirty = true;
    Store.flush();
  });
  $('#conflict-reload').addEventListener('click', async () => {
    hideConflictBanner();
    await Store.selectProfile(Store.currentId, { force: true });
    toast(currentLang === 'ru' ? 'Профиль перезагружен.' : (currentLang === 'en' ? 'Profile reloaded.' : 'Profil načtený znovu.'), 'ok');
  });
  $('#conflict-dismiss').addEventListener('click', () => {
    hideConflictBanner();
    Store.dirty = false;
  });
}

async function boot() {
  ensurePacksLoaded();
  initTheme();
  initLanguageSwitcher();
  applyLanguage(currentLang);
  initTabs();
  initProfileBar();

  Simsmix.init();
  Supersim.init();
  RandomPacks.init();
  Wheel.init();
  RandomNumber.init();

  Store.onChange(() => {
    Simsmix.syncFromState();
    Supersim.syncFromState();
    RandomPacks.syncFromState();
    Wheel.syncFromState();
    RandomNumber.syncFromState();
  });

  try {
    await Store.loadProfiles();
  } catch (error) {
    toast(`${currentLang === 'ru' ? 'Не удалось загрузить профили' : 'Profily se nepodařilo načíst'}: ${error.message}`, 'error');
    Store.setStatus('offline', error.message);
  }

  let last = null;
  try { last = Number(localStorage.getItem('simshub:lastProfile')); } catch { /* ignore */ }
  const initial = Store.profiles.find((profile) => profile.id === last) || Store.profiles[0];
  if (initial) {
    await Store.selectProfile(initial.id, { force: true });
  } else {
    Store.emit();
  }

  await activateRoute(routeFromHash());

  setInterval(() => Store.pollForRemoteChange(), POLL_INTERVAL_MS);
  window.addEventListener('online', () => { if (Store.dirty) Store.flush(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) Store.pollForRemoteChange();
  });
  // Best-effort save when the tab goes away before the debounce fires.
  window.addEventListener('pagehide', () => {
    if (!Store.dirty || Store.currentId === null) return;
    try {
      fetch(`${BASE}/api/profiles/${Store.currentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: Store.state }),
        keepalive: true,
      });
    } catch { /* nothing else to try at this point */ }
  });
}

boot();
