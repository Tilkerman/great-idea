import { useState } from 'react';
import Header from '../Header/Header';
import './SettingsPages.css';
import { useI18n } from '../../i18n';
import { feedbackService } from '../../services/db';

interface FeedbackPageProps {
  onBack: () => void;
  onSettingsClick?: () => void;
  onGoHome?: () => void;
}

export default function FeedbackPage({ onBack }: FeedbackPageProps) {
  const { t } = useI18n();
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendViaEmail = async (text: string, rating: number | null) => {
    const email = import.meta.env.VITE_FEEDBACK_EMAIL || 'vasil.ev81@mail.ru';
    const ratingText = rating ? `\n\nОценка: ${rating}/5 ⭐` : '';
    const footer = t('settings.feedback.emailFooter');
    const message = `${text}${ratingText}\n\n---\n${footer}`;
    
    try {
      // Используем FormSubmit для отправки email
      // После активации формы через письмо, она будет работать автоматически
      const formData = new FormData();
      formData.append('email', email);
      formData.append('subject', t('settings.feedback.emailSubject'));
      formData.append('message', message);
      formData.append('_captcha', 'false'); // Отключаем капчу для упрощения
      formData.append('_template', 'box'); // Простой шаблон
      
      // Используем email напрямую (после активации формы это работает)
      const response = await fetch('https://formsubmit.co/ajax/' + email, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Ошибка отправки email:', error);
      // Fallback на mailto
      const subject = encodeURIComponent(t('settings.feedback.emailSubject'));
      const body = encodeURIComponent(message);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      return false;
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const feedbackText = feedback.trim();
      // Сохраняем обратную связь в IndexedDB
      await feedbackService.saveFeedback(feedbackText, rating);
      
      // Предлагаем отправить на email
      const sendChoice = window.confirm(
        t('settings.feedback.sendChoice')
      );

      if (sendChoice) {
        // Отправляем на email
        const emailSent = await sendViaEmail(feedbackText, rating);
        if (emailSent) {
          alert(t('settings.feedback.thanks') + ' Письмо отправлено!');
        } else {
          alert(t('settings.feedback.thanks') + ' Открыт почтовый клиент для отправки.');
        }
      } else {
        alert(t('settings.feedback.thanks'));
      }
      setFeedback('');
      setRating(null);
    } catch (error) {
      console.error('Ошибка при сохранении обратной связи:', error);
      alert('Не удалось сохранить обратную связь. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header
        onBack={onBack}
        title={t('settings.feedback.title')}
      />
      <div className="settings-page">
        <div className="settings-page-content">
          <h1 className="settings-page-title">{t('settings.feedback.title')}</h1>

          <form className="feedback-form" onSubmit={handleSubmit}>
            <div className="feedback-field">
              <label htmlFor="feedback-text" className="feedback-label">
                {t('settings.feedback.label')}
              </label>
              <textarea
                id="feedback-text"
                className="feedback-textarea"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t('settings.feedback.placeholder')}
                rows={8}
                required
              />
            </div>

            <div className="feedback-field">
              <label className="feedback-label">{t('settings.feedback.rating')}</label>
              <div className="feedback-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`feedback-star ${rating && star <= rating ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                    aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="feedback-submit"
              disabled={isSubmitting || !feedback.trim()}
            >
              {isSubmitting ? t('common.saving') : t('settings.feedback.submit')}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

