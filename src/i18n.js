// Translations cover only the widget's own UI chrome (tabs, buttons, labels,
// status messages). City/country names always come from the dataset as-is
// and are never translated.
export const TRANSLATIONS = {
  en: {
    tabPaint: 'Paint',
    tabErase: 'Erase',
    tabPan: 'Pan',
    brush: 'Brush',
    citySelectedOne: 'city selected',
    citySelectedMany: 'cities selected',
    undo: 'Undo stroke',
    clear: 'Clear all',
    expandLabel: "Set every stroke's radius to",
    apply: 'Apply',
    emptyState: 'Nothing selected yet.<br>Left-click and drag on the map to paint over cities.',
    showingTop: (n, total) => `Showing top ${n} by population of ${total} selected.`
  },
  es: {
    tabPaint: 'Pintar',
    tabErase: 'Borrar',
    tabPan: 'Mover',
    brush: 'Pincel',
    citySelectedOne: 'ciudad seleccionada',
    citySelectedMany: 'ciudades seleccionadas',
    undo: 'Deshacer trazo',
    clear: 'Borrar todo',
    expandLabel: 'Ajustar el radio de cada trazo a',
    apply: 'Aplicar',
    emptyState: 'Nada seleccionado todavía.<br>Haz clic izquierdo y arrastra sobre el mapa para pintar ciudades.',
    showingTop: (n, total) => `Mostrando las ${n} principales por población de ${total} seleccionadas.`
  },
  fr: {
    tabPaint: 'Peindre',
    tabErase: 'Effacer',
    tabPan: 'Déplacer',
    brush: 'Pinceau',
    citySelectedOne: 'ville sélectionnée',
    citySelectedMany: 'villes sélectionnées',
    undo: 'Annuler le trait',
    clear: 'Tout effacer',
    expandLabel: 'Régler le rayon de chaque trait à',
    apply: 'Appliquer',
    emptyState: "Rien n'est sélectionné pour l'instant.<br>Cliquez avec le bouton gauche et faites glisser sur la carte pour peindre des villes.",
    showingTop: (n, total) => `Affichage des ${n} premières par population sur ${total} sélectionnées.`
  },
  de: {
    tabPaint: 'Malen',
    tabErase: 'Löschen',
    tabPan: 'Verschieben',
    brush: 'Pinsel',
    citySelectedOne: 'Stadt ausgewählt',
    citySelectedMany: 'Städte ausgewählt',
    undo: 'Strich rückgängig',
    clear: 'Alles löschen',
    expandLabel: 'Radius jedes Strichs festlegen auf',
    apply: 'Anwenden',
    emptyState: 'Noch nichts ausgewählt.<br>Mit der linken Maustaste auf der Karte klicken und ziehen, um Städte zu markieren.',
    showingTop: (n, total) => `Zeigt die Top ${n} nach Bevölkerung von ${total} ausgewählten.`
  },
  it: {
    tabPaint: 'Dipingi',
    tabErase: 'Cancella',
    tabPan: 'Sposta',
    brush: 'Pennello',
    citySelectedOne: 'città selezionata',
    citySelectedMany: 'città selezionate',
    undo: 'Annulla tratto',
    clear: 'Cancella tutto',
    expandLabel: 'Imposta il raggio di ogni tratto a',
    apply: 'Applica',
    emptyState: 'Nessuna selezione ancora.<br>Clicca con il tasto sinistro e trascina sulla mappa per dipingere le città.',
    showingTop: (n, total) => `Mostrando le prime ${n} per popolazione su ${total} selezionate.`
  },
  zh: {
    tabPaint: '涂抹',
    tabErase: '擦除',
    tabPan: '平移',
    brush: '画笔',
    citySelectedOne: '个城市已选中',
    citySelectedMany: '个城市已选中',
    undo: '撤销笔画',
    clear: '全部清除',
    expandLabel: '将每个笔画的半径设置为',
    apply: '应用',
    emptyState: '尚未选择任何城市。<br>在地图上按住左键拖动即可涂抹选择城市。',
    showingTop: (n, total) => `显示按人口排序的前 ${n} 个，共选中 ${total} 个。`
  },
  ar: {
    tabPaint: 'رسم',
    tabErase: 'مسح',
    tabPan: 'تحريك',
    brush: 'الفرشاة',
    citySelectedOne: 'مدينة محددة',
    citySelectedMany: 'مدن محددة',
    undo: 'تراجع عن الرسم',
    clear: 'مسح الكل',
    expandLabel: 'تعيين نصف قطر كل رسمة إلى',
    apply: 'تطبيق',
    emptyState: 'لم يتم تحديد شيء بعد.<br>انقر بزر الفأرة الأيسر واسحب فوق الخريطة لتحديد المدن.',
    showingTop: (n, total) => `عرض أفضل ${n} حسب عدد السكان من إجمالي ${total} محددة.`
  }
};

export function getTranslation(lang) {
  return TRANSLATIONS[lang] || TRANSLATIONS.en;
}
