// Global variables
let musicLibrary = [];
let playlists = [];
let currentPlaylist = null;
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffling = false;
let repeatMode = 0; // 0: off, 1: repeat all, 2: repeat one
let filteredTracks = [];

// Audio player reference
const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const volumeSlider = document.getElementById('volumeSlider');

// Initialize the music player
function initMusicPlayer() {
    // File upload handler
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);

    // Audio player event listeners
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('ended', handleTrackEnd);

    // Volume control
    volumeSlider.addEventListener('input', updateVolume);

    // Search functionality
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Load saved data
    loadSavedData();
}

// Handle file upload
function handleFileUpload(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
        if (file.type.startsWith('audio/')) {
            const track = {
                id: Date.now() + Math.random(),
                name: file.name.replace(/\.[^/.]+$/, ''),
                file: file,
                url: URL.createObjectURL(file),
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                genre: 'Unknown',
                duration: 0
            };
            musicLibrary.push(track);
        }
    });

    renderMusicLibrary();
    saveData();
}

// Render music library
function renderMusicLibrary() {
    const trackList = document.getElementById('trackList');

    if (musicLibrary.length === 0) {
        trackList.innerHTML = '<div class="empty-state">Upload music files to get started</div>';
        return;
    }

    filteredTracks = [...musicLibrary];
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    if (searchTerm) {
        filteredTracks = musicLibrary.filter(track =>
            track.name.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm) ||
            track.album.toLowerCase().includes(searchTerm)
        );
    }

    trackList.innerHTML = filteredTracks.map(track => `
                <div class="track-item ${isCurrentTrack(track) ? 'playing' : ''}" onclick="playTrack(${track.id})">
                    <div class="track-details">
                        <div class="track-name">${track.name}</div>
                        <div class="track-meta">${track.artist} • ${track.album}</div>
                    </div>
                    <div class="track-actions">
                        <button class="action-btn" onclick="event.stopPropagation(); addToPlaylist(${track.id})" title="Add to playlist">+</button>
                        <button class="action-btn" onclick="event.stopPropagation(); removeTrack(${track.id})" title="Remove">×</button>
                    </div>
                </div>
            `).join('');
}

// Check if track is currently playing
function isCurrentTrack(track) {
    const currentTracks = currentPlaylist || filteredTracks;
    return currentTracks[currentTrackIndex] && currentTracks[currentTrackIndex].id === track.id && isPlaying;
}

// Play selected track
function playTrack(trackId) {
    const track = musicLibrary.find(t => t.id === trackId);
    if (!track) return;

    const trackList = currentPlaylist || filteredTracks;
    currentTrackIndex = trackList.findIndex(t => t.id === trackId);

    audioPlayer.src = track.url;
    audioPlayer.load();

    updateNowPlaying(track);

    audioPlayer.play().then(() => {
        isPlaying = true;
        playBtn.innerHTML = '⏸';
        renderMusicLibrary();
        renderPlaylists();
    }).catch(console.error);
}

// Update now playing display
function updateNowPlaying(track) {
    document.getElementById('currentTitle').textContent = track.name;
    document.getElementById('currentArtist').textContent = `${track.artist} • ${track.album}`;
}

// Toggle play/pause
function togglePlay() {
    if (!audioPlayer.src) {
        if (musicLibrary.length > 0) {
            playTrack(musicLibrary[0].id);
        }
        return;
    }

    if (isPlaying) {
        audioPlayer.pause();
        isPlaying = false;
        playBtn.innerHTML = '▶';
    } else {
        audioPlayer.play();
        isPlaying = true;
        playBtn.innerHTML = '⏸';
    }

    renderMusicLibrary();
    renderPlaylists();
}

// Previous track
function previousTrack() {
    const trackList = currentPlaylist || filteredTracks;
    if (trackList.length === 0) return;

    currentTrackIndex = currentTrackIndex > 0 ? currentTrackIndex - 1 : trackList.length - 1;
    playTrack(trackList[currentTrackIndex].id);
}

// Next track
function nextTrack() {
    const trackList = currentPlaylist || filteredTracks;
    if (trackList.length === 0) return;

    if (isShuffling) {
        currentTrackIndex = Math.floor(Math.random() * trackList.length);
    } else {
        currentTrackIndex = currentTrackIndex < trackList.length - 1 ? currentTrackIndex + 1 : 0;
    }

    playTrack(trackList[currentTrackIndex].id);
}

// Handle track end
function handleTrackEnd() {
    if (repeatMode === 2) {
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else if (repeatMode === 1) {
        nextTrack();
    } else {
        const trackList = currentPlaylist || filteredTracks;
        if (currentTrackIndex < trackList.length - 1) {
            nextTrack();
        } else {
            isPlaying = false;
            playBtn.innerHTML = '▶';
            renderMusicLibrary();
        }
    }
}

// Toggle shuffle
function toggleShuffle() {
    isShuffling = !isShuffling;
    const shuffleBtn = document.getElementById('shuffleBtn');
    shuffleBtn.style.background = isShuffling ? 'var(--highlight)' : '';
}

// Toggle repeat
function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    const repeatBtn = document.getElementById('repeatBtn');

    switch (repeatMode) {
        case 0:
            repeatBtn.innerHTML = '🔁';
            repeatBtn.style.background = '';
            break;
        case 1:
            repeatBtn.innerHTML = '🔁';
            repeatBtn.style.background = 'var(--highlight)';
            break;
        case 2:
            repeatBtn.innerHTML = '🔂';
            repeatBtn.style.background = 'var(--highlight)';
            break;
    }
}

// Update progress bar
function updateProgress() {
    if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        document.getElementById('progress').style.width = progress + '%';
        document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
    }
}

// Update duration display
function updateDuration() {
    document.getElementById('duration').textContent = formatTime(audioPlayer.duration);
}

// Seek to position
function seek(event) {
    if (audioPlayer.duration) {
        const progressBar = event.currentTarget;
        const clickX = event.offsetX;
        const width = progressBar.offsetWidth;
        const newTime = (clickX / width) * audioPlayer.duration;
        audioPlayer.currentTime = newTime;
    }
}

// Update volume
function updateVolume() {
    const volume = volumeSlider.value / 100;
    audioPlayer.volume = volume;
    document.getElementById('volumeValue').textContent = volumeSlider.value + '%';
}

// Format time display
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Create new playlist
function createPlaylist() {
    const nameInput = document.getElementById('playlistNameInput');
    const name = nameInput.value.trim();

    if (name) {
        const playlist = {
            id: Date.now(),
            name: name,
            tracks: []
        };
        playlists.push(playlist);
        nameInput.value = '';
        renderPlaylists();
        saveData();
    }
}

// Render playlists
function renderPlaylists() {
    const playlistsList = document.getElementById('playlistsList');

    if (playlists.length === 0) {
        playlistsList.innerHTML = '<div class="empty-state">No playlists created yet</div>';
        return;
    }

    playlistsList.innerHTML = playlists.map(playlist => `
                <div class="playlist-item ${currentPlaylist && currentPlaylist.id === playlist.id ? 'active' : ''}" 
                     onclick="selectPlaylist(${playlist.id})">
                    <div>
                        <div class="track-name">${playlist.name}</div>
                        <div class="track-meta">${playlist.tracks.length} tracks</div>
                    </div>
                    <button class="action-btn" onclick="event.stopPropagation(); deletePlaylist(${playlist.id})" title="Delete">×</button>
                </div>
            `).join('');
}

// Select playlist
function selectPlaylist(playlistId) {
    const playlist = playlists.find(p => p.id === playlistId);
    currentPlaylist = playlist.tracks.length > 0 ? playlist.tracks : null;
    renderPlaylists();
    renderMusicLibrary();
}

// Add track to playlist
function addToPlaylist(trackId) {
    if (playlists.length === 0) {
        alert('Create a playlist first!');
        return;
    }

    const track = musicLibrary.find(t => t.id === trackId);
    const playlistName = prompt('Add to playlist:', playlists[0].name);

    if (playlistName) {
        const playlist = playlists.find(p => p.name === playlistName);
        if (playlist && !playlist.tracks.find(t => t.id === trackId)) {
            playlist.tracks.push(track);
            renderPlaylists();
            saveData();
        }
    }
}

// Remove track from library
function removeTrack(trackId) {
    if (confirm('Remove this track from library?')) {
        musicLibrary = musicLibrary.filter(t => t.id !== trackId);
        playlists.forEach(playlist => {
            playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
        });
        renderMusicLibrary();
        renderPlaylists();
        saveData();
    }
}

// Delete playlist
function deletePlaylist(playlistId) {
    if (confirm('Delete this playlist?')) {
        playlists = playlists.filter(p => p.id !== playlistId);
        if (currentPlaylist && currentPlaylist.id === playlistId) {
            currentPlaylist = null;
        }
        renderPlaylists();
        saveData();
    }
}

// Filter tracks by genre
function filterTracks(genre) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (genre === 'all') {
        filteredTracks = [...musicLibrary];
    } else {
        filteredTracks = musicLibrary.filter(track =>
            track.genre.toLowerCase().includes(genre.toLowerCase())
        );
    }

    renderMusicLibrary();
}

// Handle search
function handleSearch() {
    renderMusicLibrary();
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    saveData();
}

// Save data to memory
function saveData() {
    // In a real application, this would save to localStorage or a backend
    // For this demo, we're just keeping data in memory during the session
}

// Load saved data
function loadSavedData() {
    // In a real application, this would load from localStorage or a backend
    renderMusicLibrary();
    renderPlaylists();
}

// Initialize the music player when the page loads
document.addEventListener('DOMContentLoaded', initMusicPlayer);