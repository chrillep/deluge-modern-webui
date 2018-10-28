import Vue from 'vue'
import Vuex from 'vuex'

Vue.use( Vuex );

// TODO: remove
/* eslint-disable */

let request = ( method, params, path = '/json' ) => {
  const baseUrl = '***REMOVED***';
  const headers = new Headers( {
    'Accepts': 'application/json',
    'Content-Type': 'application/json'
  } );

  if ( !(process.env.NODE_ENV === 'production') ) {
    return new Promise( resolve => {
      resolve( {} );
    } );
  }

  return fetch( baseUrl + path, {
    headers,
    method: 'POST',
    body: JSON.stringify( {
      'id': 1,
      'method': method,
      'params': params
    } )
  } )
    .then( res => res.json() );
};

export default new Vuex.Store( {
  state: {
    loading: process.env.NODE_ENV === 'production',
    authenticated: !(process.env.NODE_ENV === 'production'),
    torrents: {},
    destinations: [ '/movies', '/tv-shows' ],
    destinationsTvShows: []
  },
  actions: {
    /**
     * Auth
     */
    login( { dispatch }, password ) {
      return request( 'auth.login', [ password ] )
        .then( res => {
          if ( !res.result )
          // show failed login feedback
            return;

          return dispatch( 'checkSession' );
        } );
    },

    checkSession( { commit } ) {
      return request( 'auth.check_session', [] )
        .then( res => {
          commit( 'AUTH_SESSION', res );

          return res.result;
        } );
    },

    /**
     * Info
     */

    getTorrentStatus( { commit }, torrentHash ) {
      request( 'core.get_torrent_status', [ torrentHash, [] ] )
        .then( res => {
          if ( res.error !== null )
          // show error
            return;

          commit( 'DELUGE_SET_TORRENT', res.result );
        } );
    },

    getTorrentsStatus( { commit } ) {
      request( 'core.get_torrents_status', [ [], [] ] )
        .then( res => {
          if ( res.error !== null )
          // show error
            return;

          commit( 'DELUGE_SET_TORRENTS', res.result );
        } );
    },

    /**
     * Torrents
     */
    addTorrent( { dispatch }, magnetUri, path ) {
      request( 'webapi.add_torrent', [ magnetUri, {
        'download_location': '/mnt/ext-hdd/plex/',
        'move_completed_path': path
      } ] )
        .then( res => {
          if ( res.error !== null )
            return;

          dispatch( 'getTorrentStatus', res.result );
        } )
    },

    removeTorrent( { dispatch }, torrentHash, deleteTorrentData = false ) {
      // second parameter defines if data should be deleted from disk
      request( 'webapi.remove_torrent', [ torrentHash, deleteTorrentData ] )
        .then( res => {
          if ( res.error !== null )
            return;

          dispatch( 'getTorrentsStatus' );
        } );
    },

    removeAllTorrents( { state, dispatch }, deleteTorrentData = false ) {
      for ( let torrent in state.torrents ) {
        dispatch( 'removeTorrent', torrent, deleteTorrentData );
      }
    },

    pauseTorrent( { dispatch }, torrentHash ) {
      request( 'core.pause_torrent', [ torrentHash ] )
        .then( res => {
          if ( res.error !== null )
            return;

          dispatch( 'getTorrentsStatus' );
        } );
    },

    pauseAllTorrents( { dispatch } ) {
      request( 'core.pause_all_torrents', [] )
        .then( res => {
          if ( res.error !== null )
            throw(res.error.message);

          dispatch( 'getTorrentsStatus' );
        } );
    },

    resumeTorrent( { dispatch }, torrentHash ) {
      request( 'core.resume_torrent', [ [ torrentHash ] ] )
        .then( res => {
          if ( res.error !== null )
            return;

          dispatch( 'getTorrentStatus', torrentHash );
        } );
    },

    resumeAllTorrents( { dispatch } ) {
      request( 'core.resume_all_torrents', [] )
        .then( res => {
          if ( res.error !== null )
            throw(res.error.message);

          dispatch( 'getTorrentsStatus' );
        } );
    },

    /**
     * Misc
     */
    getDestinations( { commit } ) {
      request( 'webapi.get_tv_shows', [] )
        .then( res => {
          commit( 'TORRENT_SET_DESTINATIONS', res.result );
        } );
    },

    error( err ) {
      if ( process.env.NODE_ENV !== 'production' )
        console.error( err )
    },
  },
  mutations: {
    'AUTH_LOGIN'( state ) {
      state.authenticated = true;
    },

    'AUTH_SESSION'( state, res ) {
      state.authenticated = res.result;
    },

    'DELUGE_SET_TORRENT'( state, torrent ) {
      Vue.set( state.torrents, torrent.hash, torrent );
      state.loading = false;
    },

    'DELUGE_SET_TORRENTS'( state, torrents ) {
      state.torrents = torrents;
      state.loading = false;
    },

    'TORRENT_SET_DESTINATIONS'( state, destinations ) {
      state.destinationsTvShows = destinations
    },
  }
} )