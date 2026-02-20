import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import type { RoundResponse, RoundWithResultsResponse } from '../types/api';
import './RoundPage.css';

// png-шки не было в репо, взял гуся из мокапа
const ASCII_GOOSE = `            ░░░░░░░░░░░░░░░            
          ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░           
        ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░         
        ░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░         
      ░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░       
    ░░▒▒▒▒░░░░▓▓▓▓▓▓▓▓▓▓▓▓░░░░▒▒▒▒░░   
    ░░▒▒▒▒▒▒▒▒░░░░░░░░░░░░▒▒▒▒▒▒▒▒░░   
    ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░   
      ░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░     
        ░░░░░░░░░░░░░░░░░░░░░░░░░░     `;

const RoundPage: React.FC = () => {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [roundData, setRoundData] = useState<RoundResponse | RoundWithResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTapping, setIsTapping] = useState(false);
  const [userScore, setUserScore] = useState(0);
  // без этого refetch гонялся бы каждую секунду после финиша
  const hasRefetchedOnFinish = useRef(false);

  const fetchRoundData = useCallback(async () => {
    if (!uuid) return;

    try {
      setLoading(true);
      const data = await apiService.getRound(uuid);
      setRoundData(data);
      setUserScore(data.currentUserScore);
    } catch {
      setError('Ошибка загрузки данных раунда');
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    hasRefetchedOnFinish.current = false;
    fetchRoundData();
  }, [fetchRoundData]);

  useEffect(() => {
    if (!roundData || hasRefetchedOnFinish.current) return;
    const end = new Date(roundData.round.end_datetime);
    if (currentTime > end) {
      hasRefetchedOnFinish.current = true;
      fetchRoundData();
    }
  }, [currentTime, roundData, fetchRoundData]);

  const handleTap = async () => {
    if (!roundData || isTapping || !uuid) return;

    try {
      setIsTapping(true);
      const response = await apiService.tap(uuid);
      setUserScore(response.score);
    } finally {
      setTimeout(() => setIsTapping(false), 100);
    }
  };

  const handleMouseDown = () => {
    if (roundData && !isTapping) setIsTapping(true);
  };

  const handleMouseUp = () => setIsTapping(false);
  const handleMouseLeave = () => setIsTapping(false);

  // таймер в формате MM:SS как в мокапе
  const formatMMSS = (ms: number) => {
    if (ms <= 0) return '00:00';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="round-page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (error || !roundData) {
    return (
      <div className="round-page">
        <div className="error">{error || 'Раунд не найден'}</div>
        <button onClick={() => navigate('/')} className="back-button">
          Вернуться к списку раундов
        </button>
      </div>
    );
  }

  const { round } = roundData;
  const startTime = new Date(round.start_datetime);
  const endTime = new Date(round.end_datetime);
  const isBeforeStart = currentTime < startTime;
  const isActive = currentTime >= startTime && currentTime <= endTime;
  const isFinished = currentTime > endTime;

  const pageTitle = isBeforeStart ? 'Cooldown' : isActive ? 'Раунды' : 'Раунд завершен';
  const userName = apiService.decodeToken()?.username ?? '';

  return (
    <div className="round-page">
      <div className="round-header">
        <button onClick={() => navigate('/')} className="back-button">
          ← Вернуться к списку раундов
        </button>
        <h1>
          {pageTitle} {userName && ` ${userName}`}
        </h1>
      </div>

      <div className="round-info">
        <div className="round-details">
          <div className="detail-item">
            <span className="label">Начало:</span>
            <span className="value">{formatDateTime(startTime)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Окончание:</span>
            <span className="value">{formatDateTime(endTime)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Статус:</span>
            <span className={`status ${isActive ? 'active' : isFinished ? 'finished' : 'waiting'}`}>
              {isBeforeStart ? 'Ожидание' : isActive ? 'Активен' : 'Завершен'}
            </span>
          </div>
        </div>

        {isBeforeStart && (
          <div className="countdown">
            <h2>Cooldown</h2>
            <div className="countdown-timer">
              до начала раунда {formatMMSS(startTime.getTime() - currentTime.getTime())}
            </div>
          </div>
        )}

        {isActive && (
          <div className="active-round">
            <h2>Раунд активен!</h2>
            <div className="time-remaining">
              До конца осталось: {formatMMSS(endTime.getTime() - currentTime.getTime())}
            </div>
          </div>
        )}

        {isActive && (
          <div className="score-section">
            <h3>Мои очки - {userScore}</h3>
          </div>
        )}

        {isFinished && 'totalScore' in roundData && roundData.totalScore !== undefined && (
          <div className="round-results">
            <h2>Результаты раунда</h2>
            <div className="results-grid">
              <div className="result-item">
                <span className="result-label">Всего</span>
                <span className="result-value">{roundData.totalScore}</span>
              </div>
              {roundData.bestPlayer && (
                <div className="result-item">
                  <span className="result-label">Победитель - {roundData.bestPlayer.username}</span>
                  <span className="result-value">{roundData.bestPlayer.score}</span>
                </div>
              )}
              <div className="result-item">
                <span className="result-label">Мои очки</span>
                <span className="result-value">{roundData.currentUserScore}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={`guss-container ${isTapping ? 'tapping' : ''}`}
        onClick={isActive ? handleTap : undefined}
        onMouseDown={isActive ? handleMouseDown : undefined}
        onMouseUp={isActive ? handleMouseUp : undefined}
        onMouseLeave={isActive ? handleMouseLeave : undefined}
        role={isActive ? 'button' : undefined}
        tabIndex={isActive ? 0 : undefined}
      >
        <pre className="guss-ascii">{ASCII_GOOSE}</pre>
        {isActive && <div className="tap-instruction">Кликайте на Гуса для набора очков!</div>}
      </div>
    </div>
  );
};

export default RoundPage;
