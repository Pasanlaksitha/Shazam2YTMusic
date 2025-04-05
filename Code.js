const PLAYLIST_NAME = "My Shazam";

function addSongsToShazamPlaylist() {
  backupShazamSheet();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const logSheet = getOrCreateLogSheet();

  const data = sheet.getDataRange().getValues().slice(1);
  const logData = logSheet.getDataRange().getValues().slice(1);
  const loggedSet = new Set(logData.map(row => `${row[0]}|${row[1]}|${row[2]}`));

  const playlistId = getOrCreatePlaylist(PLAYLIST_NAME);

  for (let row of data) {
    const tagTime = row[1];
    const title = row[2];
    const artist = row[3];
    const key = `${tagTime}|${title}|${artist}`;

    if (loggedSet.has(key)) {
      Logger.log(`Skipped (already logged): ${title} - ${artist}`);
      continue;
    }

    const query = `${title} ${artist} official music`;
    const videoId = searchYouTube(query);

    if (videoId) {
      try {
        addToPlaylist(playlistId, videoId);
        logSheet.appendRow([tagTime, title, artist, videoId, new Date()]);
        Logger.log(`Added: ${title} - ${artist}`);
        Utilities.sleep(1000);
      } catch (e) {
        Logger.log(`Error adding ${title}: ${e.message}`);
        break;
      }
    } else {
      Logger.log(`Skipped (not found): ${title} - ${artist}`);
    }
  }
  
}

function getOrCreatePlaylist(name) {
  const playlists = YouTube.Playlists.list("snippet", {mine: true, maxResults: 50});
  const match = playlists.items.find(p => p.snippet.title === name);
  if (match) return match.id;

  const newPlaylist = YouTube.Playlists.insert({
    snippet: {title: name, description: "Auto-created by Google Apps Script"},
    status: {privacyStatus: "private"}
  }, "snippet,status");

  return newPlaylist.id;
}

function getOrCreateLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("AddedLog");
  if (sheet) return sheet;

  const newSheet = ss.insertSheet("AddedLog");
  newSheet.appendRow(["TagTime", "Title", "Artist", "YouTubeVideoID", "DateAdded"]);
  return newSheet;
}

function searchYouTube(query) {
  const results = YouTube.Search.list("snippet", {
    q: query,
    maxResults: 1,
    type: "video",
    videoEmbeddable: "true"
  });
  return results.items.length > 0 ? results.items[0].id.videoId : null;
}

function addToPlaylist(playlistId, videoId) {
  YouTube.PlaylistItems.insert({
    snippet: {
      playlistId,
      resourceId: {
        kind: "youtube#video",
        videoId
      }
    }
  }, "snippet");
}

function backupShazamSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const original = ss.getSheetByName("Sheet1");
  const name = "Shazam_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HH:mm");
  original.copyTo(ss).setName(name);
}

