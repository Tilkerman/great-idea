// Утилита для форматирования статистики с правильными окончаниями

export function formatStatValue(count: number, type: 'days' | 'entries' | 'thoughts' | 'steps', locale: 'ru' | 'en' | 'es'): string {
  if (locale !== 'ru') {
    if (count === 1) {
      switch (type) {
        case 'days': return '1 day';
        case 'entries': return '1 entry';
        case 'thoughts': return '1 thought';
        case 'steps': return '1 step';
      }
    } else {
      switch (type) {
        case 'days': return `${count} days`;
        case 'entries': return `${count} entries`;
        case 'thoughts': return `${count} thoughts`;
        case 'steps': return `${count} steps`;
      }
    }
  } else {
    // Русский язык - правильные окончания
    if (count === 0) {
      switch (type) {
        case 'days': return '0 дней';
        case 'entries': return '0 записей';
        case 'thoughts': return '0 мыслей';
        case 'steps': return '0 шагов';
      }
    }
    
    const mod10 = count % 10;
    const mod100 = count % 100;
    
    if (mod10 === 1 && mod100 !== 11) {
      switch (type) {
        case 'days': return `${count} день`;
        case 'entries': return `${count} запись`;
        case 'thoughts': return `${count} мысль`;
        case 'steps': return `${count} шаг`;
      }
    } else if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      switch (type) {
        case 'days': return `${count} дня`;
        case 'entries': return `${count} записи`;
        case 'thoughts': return `${count} мысли`;
        case 'steps': return `${count} шага`;
      }
    } else {
      switch (type) {
        case 'days': return `${count} дней`;
        case 'entries': return `${count} записей`;
        case 'thoughts': return `${count} мыслей`;
        case 'steps': return `${count} шагов`;
      }
    }
  }
}

