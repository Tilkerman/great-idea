// Утилиты для определения уровня активности и показа понятных индикаторов

export type ActivityLevel = 'low' | 'medium' | 'high' | 'very-high';

export interface ActivityIndicator {
  level: ActivityLevel;
  label: string; // "Низкая активность"
  icon: string; // "🐌"
  color: string; // цвет для индикатора
  frequency: string; // "Контакты раз в 2-3 дня"
  recommendation: string; // рекомендация
}

/**
 * Определяет уровень активности на основе средней активности в день
 */
export function getActivityLevel(avgActivityPerDay: number): ActivityLevel {
  if (avgActivityPerDay >= 3) return 'very-high';
  if (avgActivityPerDay >= 1.5) return 'high';
  if (avgActivityPerDay >= 0.5) return 'medium';
  return 'low';
}

/**
 * Получает индикатор активности с понятными метками
 */
export function getActivityIndicator(avgActivityPerDay: number, locale: 'ru' | 'en' | 'es'): ActivityIndicator {
  const level = getActivityLevel(avgActivityPerDay);
  
  if (locale === 'ru') {
    switch (level) {
      case 'very-high':
        return {
          level,
          label: 'Очень высокая активность',
          icon: '🔥',
          color: '#ff6b35',
          frequency: `~${avgActivityPerDay.toFixed(1)} контактов в день`,
          recommendation: 'Отличная работа! Вы регулярно возвращаетесь к этому желанию.',
        };
      case 'high':
        return {
          level,
          label: 'Высокая активность',
          icon: '⭐',
          color: '#4caf50',
          frequency: `~${avgActivityPerDay.toFixed(1)} контактов в день`,
          recommendation: 'Хорошая регулярность! Продолжайте в том же духе.',
        };
      case 'medium':
        return {
          level,
          label: 'Умеренная активность',
          icon: '📊',
          color: '#ffa726',
          frequency: avgActivityPerDay < 1 
            ? `Контакты раз в ${Math.round(1 / avgActivityPerDay)} дня`
            : `~${avgActivityPerDay.toFixed(1)} контактов в день`,
          recommendation: 'Попробуйте возвращаться к этому желанию чаще для лучшего результата.',
        };
      case 'low':
        return {
          level,
          label: 'Низкая активность',
          icon: '🐌',
          color: '#9e9e9e',
          frequency: avgActivityPerDay > 0
            ? `Контакты раз в ${Math.round(1 / avgActivityPerDay)} дней`
            : 'Контактов пока нет',
          recommendation: 'Уделите больше внимания этому желанию. Регулярность — ключ к успеху!',
        };
    }
  } else {
    // English
    switch (level) {
      case 'very-high':
        return {
          level,
          label: 'Very High Activity',
          icon: '🔥',
          color: '#ff6b35',
          frequency: `~${avgActivityPerDay.toFixed(1)} contacts per day`,
          recommendation: 'Excellent work! You regularly return to this wish.',
        };
      case 'high':
        return {
          level,
          label: 'High Activity',
          icon: '⭐',
          color: '#4caf50',
          frequency: `~${avgActivityPerDay.toFixed(1)} contacts per day`,
          recommendation: 'Good consistency! Keep it up.',
        };
      case 'medium':
        return {
          level,
          label: 'Medium Activity',
          icon: '📊',
          color: '#ffa726',
          frequency: avgActivityPerDay < 1
            ? `Contacts every ${Math.round(1 / avgActivityPerDay)} days`
            : `~${avgActivityPerDay.toFixed(1)} contacts per day`,
          recommendation: 'Try to return to this wish more often for better results.',
        };
      case 'low':
        return {
          level,
          label: 'Low Activity',
          icon: '🐌',
          color: '#9e9e9e',
          frequency: avgActivityPerDay > 0
            ? `Contacts every ${Math.round(1 / avgActivityPerDay)} days`
            : 'No contacts yet',
          recommendation: 'Give more attention to this wish. Consistency is the key to success!',
        };
    }
  }
}

/**
 * Сравнивает активность желания со средней активностью всех желаний
 */
export function compareWithAverage(
  currentActivity: number,
  averageActivity: number
): 'above' | 'average' | 'below' {
  if (currentActivity > averageActivity * 1.2) return 'above'; // на 20% выше среднего
  if (currentActivity < averageActivity * 0.8) return 'below'; // на 20% ниже среднего
  return 'average';
}

