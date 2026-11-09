const makerIdInput = document.getElementById('makerId');
const streakInput = document.getElementById('streakCount');
const decimalSelect = document.getElementById('decimalSelect');
const saveIdBtn = document.getElementById('saveIdBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const loseStreakMask = document.getElementById('loseStreakMask');

const tabBattleBtn = document.getElementById('tabBattleBtn');
const tabMakerBtn = document.getElementById('tabMakerBtn');
const battleContent = document.getElementById('battleContent');
const makerContent = document.getElementById('makerContent');

let globalVersusWon = 0;
let globalTotalPlayed = 0;

// タブ切り替え処理（要素が存在する場合のみイベント登録）
if (tabBattleBtn && tabMakerBtn && battleContent && makerContent) {
  tabBattleBtn.addEventListener('click', () => {
    tabBattleBtn.classList.add('active');
    tabMakerBtn.classList.remove('active');
    battleContent.style.display = 'block';
    makerContent.style.display = 'none';
  });

  tabMakerBtn.addEventListener('click', () => {
    tabMakerBtn.classList.add('active');
    tabBattleBtn.classList.remove('active');
    makerContent.style.display = 'block';
    battleContent.style.display = 'none';
  });
}

// キャッシュ状態をチェックして削除ボタンの表示・非表示を切替
function checkCacheState() {
  const savedId = localStorage.getItem('savedMakerId');
  if (savedId && clearCacheBtn) {
    clearCacheBtn.style.display = 'inline-block';
  } else if (clearCacheBtn) {
    clearCacheBtn.style.display = 'none';
  }
}

// 初期化（保存された職人IDや桁数設定があれば反映）
window.addEventListener('DOMContentLoaded', () => {
  const savedId = localStorage.getItem('savedMakerId');
  if (savedId && makerIdInput) {
    makerIdInput.value = savedId;
  }

  const savedDecimal = localStorage.getItem('savedDecimal');
  if (savedDecimal && decimalSelect) {
    decimalSelect.value = savedDecimal;
  }

  checkCacheState();
});

// リアルタイムでハイフン「-」および「ー」を除去
if (makerIdInput) {
  makerIdInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[-ー]/g, '');
  });
}

// 桁数セレクト変更時にストレージへ保存して即座に再計算
if (decimalSelect) {
  decimalSelect.addEventListener('change', () => {
    localStorage.setItem('savedDecimal', decimalSelect.value);
    if (globalTotalPlayed > 0 || globalVersusWon > 0) {
      updateCalculations();
    }
  });
}

// 黒塗り連敗数マスクのクリックイベント
if (loseStreakMask) {
  loseStreakMask.addEventListener('click', () => {
    loseStreakMask.classList.toggle('revealed');
  });
}

// 職人IDを保存するボタン
if (saveIdBtn) {
  saveIdBtn.addEventListener('click', () => {
    const makerId = makerIdInput.value.replace(/[-ー]/g, '').trim();
    if (makerId) {
      localStorage.setItem('savedMakerId', makerId);
      if (decimalSelect) {
        localStorage.setItem('savedDecimal', decimalSelect.value);
      }
      checkCacheState();
      alert('職人IDと設定を記憶しました！');
    }
  });
}

// キャッシュを削除するボタン
if (clearCacheBtn) {
  clearCacheBtn.addEventListener('click', () => {
    localStorage.removeItem('savedMakerId');
    localStorage.removeItem('savedDecimal');
    if (makerIdInput) makerIdInput.value = '';
    if (decimalSelect) decimalSelect.value = '2';
    checkCacheState();
    alert('記憶したキャッシュを削除しました。');
  });
}

// Unixtime（秒）を 日時文字列（YYYY/MM/DD HH:mm:ss）に変換する関数
function formatUnixTime(unixTimestamp) {
  const date = new Date(unixTimestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// バトルランクと現在のレートから「次のランク」と「目標レート」を計算する関数
function getNextRankInfo(currentRank, rating) {
  const rankThresholds = [
    { rank: 'D', nextRank: 'C', target: 1000 },
    { rank: 'C', nextRank: 'B', target: 2000 },
    { rank: 'B', nextRank: 'A', target: 3000 },
    { rank: 'A', nextRank: 'S', target: 4000 },
    { rank: 'S', nextRank: 'S+', target: 5000 }
  ];

  const currentInfo = rankThresholds.find(item => item.rank.toUpperCase() === currentRank.toUpperCase());

  if (currentInfo) {
    const diff = currentInfo.target - rating;
    return {
      nextRank: currentInfo.nextRank,
      needed: diff > 0 ? diff : 0
    };
  } else if (currentRank.toUpperCase() === 'S+') {
    return {
      nextRank: '最高ランク',
      needed: 0
    };
  } else {
    const nextTarget = Math.ceil((rating + 1) / 1000) * 1000;
    return {
      nextRank: '上位ランク',
      needed: nextTarget - rating
    };
  }
}

// 勝率と連勝率を再計算して表示する関数
function updateCalculations() {
  const winRateMsg = document.getElementById('winRateMsg');
  const approxWinMsg = document.getElementById('approxWinMsg');
  const streakWinRateMsg = document.getElementById('streakWinRateMsg');

  const streakCount = streakInput ? (parseInt(streakInput.value, 10) || 1) : 1;
  const decimalDigits = decimalSelect ? (parseInt(decimalSelect.value, 10) || 2) : 2;

  if (globalTotalPlayed === 0) {
    if (winRateMsg) winRateMsg.textContent = '勝率: 0.00%';
    if (approxWinMsg) approxWinMsg.textContent = 'およそ 0回に1回勝利';
    if (streakWinRateMsg) streakWinRateMsg.textContent = `${streakCount}連勝の勝率: 0.0000%`;
    return;
  }

  const winRatio = globalVersusWon / globalTotalPlayed;
  const winRate = winRatio * 100;

  if (winRateMsg) {
    winRateMsg.textContent = `勝率: ${winRate.toFixed(decimalDigits)}%`;
  }

  if (approxWinMsg && globalVersusWon > 0) {
    const timesPerWin = Math.round(globalTotalPlayed / globalVersusWon);
    approxWinMsg.textContent = `およそ ${timesPerWin}回に1回勝利`;
  } else if (approxWinMsg) {
    approxWinMsg.textContent = 'およそ 0回に1回勝利';
  }

  const streakRatio = Math.pow(winRatio, streakCount);
  const streakWinRate = streakRatio * 100;
  if (streakWinRateMsg) {
    streakWinRateMsg.textContent = `${streakCount}連勝の勝率: ${streakWinRate.toFixed(4)}%`;
  }
}

// 連勝数の変更時に自動で再計算
if (streakInput) {
  streakInput.addEventListener('input', () => {
    updateCalculations();
  });
}

const calcBtn = document.getElementById('calcBtn');
if (calcBtn) {
  calcBtn.addEventListener('click', async () => {
    const makerId = makerIdInput ? makerIdInput.value.replace(/[-ー]/g, '').trim() : '';

    const errorMsg = document.getElementById('errorMsg');
    const resultBox = document.getElementById('resultBox');

    if (errorMsg) errorMsg.textContent = '';
    if (resultBox) resultBox.style.display = 'none';

    if (!makerId) {
      if (errorMsg) errorMsg.textContent = '職人IDを入力してください。';
      return;
    }

    try {
      const response = await fetch(`https://tgrcode.com/mm2/user_info/${makerId}`);
      if (!response.ok) {
        throw new Error('API Error');
      }

      const rawText = await response.text();

      // 抽出処理
      const miiImageMatch = rawText.match(/"mii_image":\s*"([^"]+)"\s*,"mii_studio_code/);
      const nameMatch = rawText.match(/"name":\s*"([^"]+)"\s*,"country/);
      const ratingMatch = rawText.match(/"versus_rating":\s*(\d+)\s*,"versus_rank/);
      const rankMatch = rawText.match(/"versus_rank_name":\s*"([^"]+)"\s*,"versus_won/);
      const wonMatch = rawText.match(/"versus_won":\s*(\d+)\s*,"versus_lost/);
      const lostMatch = rawText.match(/"versus_lost":\s*(\d+)\s*,"versus_win_streak/);
      const winStreakMatch = rawText.match(/"versus_win_streak":\s*(\d+)\s*,"versus_lose_streak/);
      const loseStreakMatch = rawText.match(/"versus_lose_streak":\s*(\d+)\s*,"versus_plays":/);

      // 職人タブ用
      const lastActiveMatch = rawText.match(/"last_active":\s*(\d+)\s*,"last_active_pretty/);
      const makerPointsMatch = rawText.match(/"maker_points":\s*(\d+)\s*,"easy_highscore/);
      const likesMatch = rawText.match(/"likes":\s*(\d+)\s*,"maker_points/);
      const weeklyMakerPointsMatch = rawText.match(/"weekly_maker_points":\s*(\d+)\s*,"last_uploaded_level/);
      const uploadedLevelsMatch = rawText.match(/"uploaded_levels":\s*(\d+)\s*,"maximum_uploaded_levels/);

      if (
        !wonMatch || !lostMatch || !ratingMatch || !rankMatch || !nameMatch || !miiImageMatch || 
        !winStreakMatch || !loseStreakMatch || !lastActiveMatch || !makerPointsMatch || 
        !likesMatch || !weeklyMakerPointsMatch || !uploadedLevelsMatch
      ) {
        if (errorMsg) errorMsg.textContent = '職人IDが間違ってるか、存在しません。';
        return;
      }

      // 値の取得
      const miiImageUrl = miiImageMatch[1];
      const userName = nameMatch[1];
      const rating = parseInt(ratingMatch[1], 10);
      const rankName = rankMatch[1];
      const winStreak = parseInt(winStreakMatch[1], 10);
      const loseStreak = parseInt(loseStreakMatch[1], 10);

      const lastActiveUnix = parseInt(lastActiveMatch[1], 10);
      const makerPoints = parseInt(makerPointsMatch[1], 10);
      const likes = parseInt(likesMatch[1], 10);
      const weeklyMakerPoints = parseInt(weeklyMakerPointsMatch[1], 10);
      const uploadedLevels = parseInt(uploadedLevelsMatch[1], 10);

      globalVersusWon = parseInt(wonMatch[1], 10);
      const versusLost = parseInt(lostMatch[1], 10);
      globalTotalPlayed = globalVersusWon + versusLost;

      // UIへの流し込み（基本情報 & みんバト）
      const miiImageEl = document.getElementById('miiImage');
      const userNameEl = document.getElementById('userName');
      const ratingMsgEl = document.getElementById('ratingMsg');
      const rankMsgEl = document.getElementById('rankMsg');
      const winStreakMsgEl = document.getElementById('winStreakMsg');

      if (miiImageEl) miiImageEl.src = miiImageUrl;
      if (userNameEl) userNameEl.textContent = userName;
      if (ratingMsgEl) ratingMsgEl.textContent = `今のレート: ${rating}`;
      if (rankMsgEl) rankMsgEl.textContent = `今のバトルランク: ${rankName}`;
      if (winStreakMsgEl) winStreakMsgEl.textContent = `現在、${winStreak}連勝中`;

      // UIへの流し込み（職人タブ用）
      const lastActiveMsgEl = document.getElementById('lastActiveMsg');
      const makerPointsMsgEl = document.getElementById('makerPointsMsg');
      const likesMsgEl = document.getElementById('likesMsg');
      const weeklyMakerPointsMsgEl = document.getElementById('weeklyMakerPointsMsg');
      const uploadedLevelsMsgEl = document.getElementById('uploadedLevelsMsg');

      if (lastActiveMsgEl) lastActiveMsgEl.textContent = `最終ログイン: ${formatUnixTime(lastActiveUnix)}`;
      if (makerPointsMsgEl) makerPointsMsgEl.textContent = `職人ポイント: ${makerPoints.toLocaleString()}`;
      if (likesMsgEl) likesMsgEl.textContent = `いいね！数: ${likes.toLocaleString()}`;
      if (weeklyMakerPointsMsgEl) weeklyMakerPointsMsgEl.textContent = `週間職人ポイント: ${weeklyMakerPoints.toLocaleString()}`;
      if (uploadedLevelsMsgEl) uploadedLevelsMsgEl.textContent = `投稿したコースの数: ${uploadedLevels.toLocaleString()}`;

      // 連敗数の黒塗りリセット
      if (loseStreakMask) {
        loseStreakMask.textContent = loseStreak;
        loseStreakMask.classList.remove('revealed');
      }

      // 通算戦績の流し込み
      const totalPlayedMsgEl = document.getElementById('totalPlayedMsg');
      const totalWonMsgEl = document.getElementById('totalWonMsg');
      if (totalPlayedMsgEl) totalPlayedMsgEl.textContent = `プレイした回数: ${globalTotalPlayed}回`;
      if (totalWonMsgEl) totalWonMsgEl.textContent = `勝った回数: ${globalVersusWon}回`;

      // 次のバトルランク計算
      const nextRankInfo = getNextRankInfo(rankName, rating);
      const nextRankMsg = document.getElementById('nextRankMsg');

      if (nextRankMsg) {
        if (rankName.toUpperCase() === 'S+') {
          nextRankMsg.textContent = '最高ランク(S+)に到達しています！';
        } else {
          nextRankMsg.textContent = `次のバトルランクアップ(${nextRankInfo.nextRank})まで: ${nextRankInfo.needed}レート`;
        }
      }

      // 計算成功時に「職人IDを記憶する」ボタンを表示
      if (saveIdBtn) saveIdBtn.style.display = 'inline-block';

      // デフォルトで「みんバト」タブをアクティブにする
      if (tabBattleBtn) tabBattleBtn.click();

      // 勝率計算の実行と表示
      updateCalculations();
      if (resultBox) resultBox.style.display = 'block';

    } catch (err) {
      const errorMsg = document.getElementById('errorMsg');
      if (errorMsg) errorMsg.textContent = '職人IDが間違ってるか、存在しません。';
    }
  });
}
