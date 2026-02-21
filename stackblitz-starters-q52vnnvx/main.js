// =======================
// MAIN.JS — pełny plik
// =======================

if (!window.supabaseInitialized) {
  console.log('MAIN JS LOADED');

  // ===============================
  // Inicjalizacja Supabase
  // ===============================
  const supabase = window.supabase.createClient(
    'https://wzanqzcjrpbhocrfcciy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YW5xemNqcnBiaG9jcmZjY2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzQ4MjUsImV4cCI6MjA4NzAxMDgyNX0.VNer3odvLPJzBbecICFZFw86SXvvCbEZDQNVciEm97k'
  );

  window.supabaseClient = supabase;
  window.supabaseInitialized = true;

  // ===============================
  // Zmienne globalne
  // ===============================
  let players = [];
  let currentRoundId = null;
  let lastLeader = null;

  const datePicker = document.getElementById('datePicker');
  const rankingTable = document.getElementById('rankingTable');
  const panelsDiv = document.getElementById('panels');

  datePicker.value = new Date().toISOString().split('T')[0];

  // ===============================
  // Eventy
  // ===============================
  datePicker.addEventListener('change', async () => {
    await ensureRound(datePicker.value);
    await loadPlayers();
  });

  document.getElementById('addPlayerBtn').addEventListener('click', addPlayer);

  // ===============================
  // Funkcje
  // ===============================

  async function ensureRound(date) {
    const { data } = await window.supabaseClient
      .from('rounds')
      .select('*')
      .eq('round_date', date)
      .single();

    if (!data) {
      const { data: newRound } = await window.supabaseClient
        .from('rounds')
        .insert({ round_date: date })
        .select()
        .single();
      currentRoundId = newRound.id;
    } else {
      currentRoundId = data.id;
    }
  }

  async function loadPlayers() {
    const { data, error } = await window.supabaseClient
      .from('players')
      .select('*')
      .order('rating', { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    players = data || [];
    renderRanking();
    renderPanels();
  }

  function renderRanking() {
    rankingTable.innerHTML = `
      <tr>
        <th>#</th>
        <th>Gracz</th>
        <th>Punkty</th>
        <th>Zmiana</th>
      </tr>
    `;

    document.getElementById('currentDateDisplay').innerText =
      'Data rundy: ' + datePicker.value;

    players.forEach((p, i) => {
      let medal = '';
      if (i === 0) medal = '🥇';
      if (i === 1) medal = '🥈';
      if (i === 2) medal = '🥉';

      const diff = Math.round(p.rating - 1000);

      rankingTable.innerHTML += `
        <tr class="${i === 0 ? 'leader' : ''}">
          <td>${medal || i + 1}</td>
          <td>${p.name}</td>
          <td>${Math.round(p.rating)}</td>
          <td class="${diff >= 0 ? 'positive' : 'negative'}">
            ${diff >= 0 ? '+' : ''}${diff}
          </td>
        </tr>
      `;
    });

    triggerLeaderEffect();
  }

  function renderPanels() {
    panelsDiv.innerHTML = '';

    players.forEach((voter) => {
      const card = document.createElement('div');
      card.className = 'card';

      let html = `<h3>${voter.name} ocenia:</h3>`;

      players.forEach((player) => {
        html += `
          <div>
            ${player.name}
            <input type="number" min="1" max="10"
              id="${voter.id}_${player.id}" />
          </div>
        `;
      });

      html += `<button onclick="saveVotes('${voter.name}')">Zapisz</button>`;
      card.innerHTML = html;
      panelsDiv.appendChild(card);
    });
  }

  window.saveVotes = async function (voterName) {
    for (let player of players) {
      const input = document.getElementById(
        players.find((p) => p.name === voterName).id + '_' + player.id
      );

      const score = input.value;
      if (!score) continue;

      await window.supabaseClient.from('votes').upsert({
        round_id: currentRoundId,
        player_id: player.id,
        voter_name: voterName,
        score: Number(score),
      });
    }

    // Wywołaj funkcję PL/pgSQL w Supabase
    await window.supabaseClient.rpc('calculate_round', {
      p_round_id: currentRoundId,
    });

    await loadPlayers();
    alert('Zapisano!');
  };

  async function addPlayer() {
    const name = document.getElementById('newPlayerName').value;
    if (!name) return;

    const { data, error } = await window.supabaseClient
      .from('players')
      .insert({ name });

    if (error) {
      alert('Błąd: ' + error.message);
      console.error(error);
      return;
    }

    document.getElementById('newPlayerName').value = '';
    await loadPlayers();
  }

  function triggerLeaderEffect() {
    if (!players.length) return;

    const newLeader = players[0].name;

    if (lastLeader && lastLeader !== newLeader) {
      const row = document.querySelector('.leader');
      if (row) {
        row.style.animation = 'glow 1s ease';
      }
    }

    lastLeader = newLeader;
  }

  // Renderowanie paneli (lewy + prawy, jedno pod drugim)
  function renderPanels() {
    panelsDiv.innerHTML = '';

    players.forEach((voter) => {
      const card = document.createElement('div');
      card.className = 'card';

      let html = `<h3>${voter.name} ocenia:</h3>`;

      players.forEach((player) => {
        html += `
        <div class="panel-row">
          <span>${player.name}</span>
          <input type="number" min="1" max="10" id="${voter.id}_${player.id}" />
        </div>
      `;
      });

      html += `<button onclick="saveVotes('${voter.name}')">Zapisz</button>`;
      card.innerHTML = html;
      panelsDiv.appendChild(card);
    });
  }

  //
  window.saveVotes = async function (voterName) {
    for (let player of players) {
      const input = document.getElementById(
        players.find((p) => p.name === voterName).id + '_' + player.id
      );

      const score = input.value;
      if (!score) continue;

      await window.supabaseClient.from('votes').upsert({
        round_id: currentRoundId,
        player_id: player.id,
        voter_name: voterName,
        score: Number(score),
      });
    }

    for (let player of players) {
      const { data: votes } = await window.supabaseClient
        .from('votes')
        .select('*')
        .eq('round_id', currentRoundId)
        .eq('player_id', player.id);

      if (!votes || votes.length === 0) {
        await window.supabaseClient
          .from('players')
          .update({ rating: player.rating - 20 })
          .eq('id', player.id);
      }
    }

    await window.supabaseClient.rpc('calculate_round', {
      p_round_id: currentRoundId,
    });

    await loadPlayers();
    alert('Zapisano!');
  };

  async function init() {
    await ensureRound(datePicker.value);
    await loadPlayers();
  }

  init();
} // <-- koniec if (!window.supabaseInitialized)
