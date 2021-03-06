/* eslint-disable no-use-before-define */
import Vue from 'vue';
import moment from 'moment';

import { requests } from '../constants';
import { alerts, db, neo, dex } from '../services';

export {
  clearActiveTransaction,
  clearRecentTransactions,
  clearSearchTransactions,
  endRequest,
  failRequest,
  handleLogout,
  handleNetworkChange,
  orderBookSnapshotReceived,
  orderBookUpdateReceived,
  putAllNep5Balances,
  putTransactionDetail,
  resetRequests,
  setAcceptDexDemoVersion,
  setAcceptDexOutOfDate,
  setActiveTransaction,
  setContacts,
  setCurrency,
  setCurrencySymbol,
  setCurrentMarket,
  setCurrentNetwork,
  setCurrentWallet,
  setDepositWithdrawModalModel,
  setGasClaim,
  setHoldings,
  setLastReceivedBlock,
  setLastSuccessfulRequest,
  setLatestVersion,
  setMarkets,
  setOrderHistory,
  setOrderPrice,
  setOrderQuantity,
  setOrderToConfirm,
  setPortfolio,
  setRecentTransactions,
  setSearchTransactionFromDate,
  setSearchTransactionToDate,
  setSearchTransactions,
  setSendInProgress,
  setShowAddContactModal,
  setShowAddTokenModal,
  setShowClaimGasModal,
  setShowEditContactModal,
  setShowImportAWalletModal,
  setShowLoginToWalletModal,
  setShowSendAddressModal,
  setShowSendRequestLedgerSignature,
  setShowSendWithLedgerModal,
  setShowWalletBackupModal,
  setSocketOrderCreated,
  setSocketOrderMatched,
  setSocketOrderCreationFailed,
  setSocketOrderMatchFailed,
  setStatsToken,
  setStyleMode,
  setTradeHistory,
  setWallets,
  startRequest,
  SOCKET_ONOPEN,
  SOCKET_ONCLOSE,
  SOCKET_ONMESSAGE,
  SOCKET_RECONNECT_ERROR,
};

function clearActiveTransaction(state) {
  state.showPriceTile = true;
}

function clearRecentTransactions(state) {
  state.recentTransactions = [];
}

function clearSearchTransactions(state) {
  state.searchTransactions = [];
}

function endRequest(state, payload) {
  updateRequest(state, payload, requests.SUCCESS);
}

function failRequest(state, payload) {
  updateRequest(state, payload, requests.FAILED);
}

function handleLogout(state) {
  state.holdings = [];
  state.recentTransactions = [];
  state.searchTransactions = [];
  state.nep5Balances = {};
  state.sendInProgress = false;
  state.currentMarket = null;
  neo.fetchNEP5Tokens();
}

function handleNetworkChange(state) {
  state.holdings = [];
  state.recentTransactions = [];
  state.searchTransactions = [];
  state.nep5Balances = {};
  state.sendInProgress = false;
  state.currentMarket = null;
  neo.fetchNEP5Tokens();
}

function putAllNep5Balances(state, nep5balances) {
  const balances = state.nep5Balances;
  nep5balances.forEach((nep5balance) => {
    _.set(balances, nep5balance.assetId, nep5balance);
  });
}

function putTransactionDetail(state, transactionDetail) {
  const details = state.transactionDetails;
  _.set(details, transactionDetail.txid, transactionDetail);
}

function resetRequests(state) {
  state.requests = {};
}

function setAcceptDexDemoVersion(state, value) {
  state.acceptDexDemoVersion = value;
}

function setAcceptDexOutOfDate(state, value) {
  state.acceptDexOutOfDate = value;
}

function setActiveTransaction(state, transaction) {
  state.activeTransaction = transaction;
  state.showPriceTile = false;
}

function setContacts(state, contacts) {
  state.contacts = contacts;
}

function setCurrency(state, currency) {
  state.currency = currency;
}

function setCurrencySymbol(state, currencySymbol) {
  state.currencySymbol = currencySymbol;
}

function setCurrentWallet(state, currentWallet) {
  state.holdings = [];
  state.statsToken = null;
  state.portfolio = {};
  state.recentTransactions = [];

  state.currentWallet = currentWallet;
}

function setCurrentNetwork(state, network) {
  if (state.currentNetwork && state.currentNetwork.net !== network.net) {
    clearLocalNetworkState(state, network);
  }

  state.currentNetwork = network;
}

async function setHoldings(state, holdings) {
  if (!_.isEmpty(holdings)) {
    state.holdings = holdings;
  }

  if (!state.statsToken && !_.isEmpty(holdings)) {
    state.statsToken = holdings[0];
  } else if (state.statsToken) {
    state.statsToken = _.find(state.holdings, (o) => {
      return o.symbol === state.statsToken.symbol;
    });
    if (!state.statsToken && !_.isEmpty(holdings)) {
      state.statsToken = holdings[0];
    }
  }

  if (!state.currentWallet || !state.currentNetwork) {
    return;
  }

  const holdingsStorageKey = `holdings.${state.currentWallet.address}.${state.currentNetwork.net}`;
  db.upsert(holdingsStorageKey, holdings);
}

function setLastReceivedBlock(state) {
  state.lastReceivedBlock = moment().unix();
}

function setLastSuccessfulRequest(state) {
  state.lastSuccessfulRequest = moment().unix();
}

function setPortfolio(state, portfolio) {
  if (portfolio) {
    state.portfolio = portfolio;
  }

  if (!state.currentWallet || !state.currentNetwork) {
    return;
  }

  const portfolioStorageKey = `portfolios.${state.currentWallet.address}.${state.currentNetwork.net}`;
  db.upsert(portfolioStorageKey, portfolio);
}

function setRecentTransactions(state, transactions) {
  const existingIsEmpty = !state.recentTransactions || state.recentTransactions.length === 0;

  _.sortBy(transactions, 'block_index').forEach((t) => {
    const existingTransaction = _.find(state.recentTransactions, (o) => {
      return o.hash === t.hash && o.symbol === t.symbol;
    });
    if (existingTransaction) {
      return;
    }
    state.recentTransactions.unshift(t);
    if (existingIsEmpty === false) {
      alerts.success(`New Transaction Found. TX: ${t.hash}`);
    }
  });

  if (!state.currentWallet || !state.currentNetwork) {
    return;
  }

  const transactionsStorageKey = `txs.${state.currentWallet.address}.${state.currentNetwork.net}`;

  db.upsert(transactionsStorageKey, normalizeRecentTransactions(state.recentTransactions));
}

function clearLocalNetworkState(state, newNetwork) {
  state.holdings = [];
  state.statsToken = null;
  state.portfolio = {};
  state.recentTransactions = [];

  const holdingsStorageKey = `holdings.${state.currentWallet.address}.${newNetwork.net}`;
  db.remove(holdingsStorageKey);

  const portfolioStorageKey = `portfolios.${state.currentWallet.address}.${newNetwork.net}`;
  db.remove(portfolioStorageKey);

  const transactionsStorageKey = `txs.${state.currentWallet.address}.${newNetwork.net}`;
  db.remove(transactionsStorageKey);
}

function setLatestVersion(state, version) {
  state.latestVersion = version;
}

function setSearchTransactionFromDate(state, fromDate) {
  state.searchTransactionFromDate = fromDate;
}

function setSearchTransactionToDate(state, toDate) {
  state.searchTransactionToDate = toDate;
}

function setSearchTransactions(state, transactions) {
  state.searchTransactions = transactions;
}

function setShowAddContactModal(state, value) {
  state.showAddContactModal = value;
  state.currentEditContact = null;
}

function setShowAddTokenModal(state, value) {
  state.showAddTokenModal = value;
}

function setShowEditContactModal(state, contact) {
  state.showAddContactModal = true;
  state.currentEditContact = contact;
}

function setShowSendAddressModal(state, value) {
  state.showSendAddressModal = value;
}

function setShowLoginToWalletModal(state, wallet) {
  const show = wallet !== null;
  state.showLoginToWalletModal = show;
  state.currentLoginToWallet = wallet;
}

function setShowImportAWalletModal(state, value) {
  state.showImportAWalletModal = value;
}

function setShowSendWithLedgerModal(state, value) {
  state.showSendWithLedgerModal = value;
}

function setShowSendRequestLedgerSignature(state, value) {
  state.showSendRequestLedgerSignature = value;
}

function setSendInProgress(state, value) {
  state.sendInProgress = value;
}

function setShowWalletBackupModal(state, value) {
  state.showWalletBackupModal = value;
}

function setSocketOrderCreated(state, value) {
  state.socket.orderCreated = value;
}

function setSocketOrderMatched(state, value) {
  state.socket.orderMatched = value;
}

function setSocketOrderCreationFailed(state, value) {
  state.socket.orderCreationFailed = value;
}

function setSocketOrderMatchFailed(state, value) {
  state.socket.orderMatchFailed = value;
}

function setStatsToken(state, token) {
  state.statsToken = token;
  state.showPriceTile = true;
  state.activeTransaction = null;
}

function setWallets(state, wallets) {
  state.wallets = wallets;
}

function setGasClaim(state, value) {
  state.gasClaim = value;
}

function setShowClaimGasModal(state, value) {
  state.showClaimGasModal = value;
}

function startRequest(state, payload) {
  updateRequest(state, payload, requests.PENDING);
}

function updateRequest(state, { identifier, message }, status) {
  Vue.set(state.requests, identifier, { status, message });
}

function setStyleMode(state, style) {
  state.styleMode = style;
}
function setMarkets(state, markets) {
  state.markets = markets;
}
function setCurrentMarket(state, market) {
  if (state.currentMarket) {
    if (!market || state.currentMarket.marketName !== market.marketName) {
      this.dispatch('unsubscribeFromMarket', {
        market: state.currentMarket,
      });
    }
  }
  state.currentMarket = market;
  if (state.currentMarket) {
    this.dispatch('subscribeToMarket', {
      market: state.currentMarket,
    });
  }
}
function setOrderPrice(state, price) {
  state.orderPrice = price;
}
function setOrderQuantity(state, quantity) {
  state.orderQuantity = quantity;
}
function orderBookSnapshotReceived(state, res) {
  const orderBook = dex.formOrderBook(res.asks, res.bids);
  orderBook.pair = res.pair;

  Vue.set(state, 'orderBook', orderBook);
}
function orderBookUpdateReceived(state, res) {
  if (!state.orderBook || state.orderBook.pair !== res.pair) {
    return;
  }

  const orderBook = dex.updateOrderBook(state.orderBook, res.side, res.changes);
  const side = res.side === 'ask' ? orderBook.asks : orderBook.bids;
  Vue.set(state.orderBook, res.side, side);
}
function setTradeHistory(state, trades) {
  state.tradeHistory = trades;
}
function setOrderHistory(state, orders) {
  state.orderHistory = orders;
}
function setOrderToConfirm(state, order) {
  state.orderToConfirm = order;
  state.showOrderConfirmationModal = !!order;
}
function setDepositWithdrawModalModel(state, model) {
  state.depositWithdrawModalModel = model;
}
function SOCKET_ONOPEN(state, event) {
  state.socket.client = event.target;
  state.socket.isConnected = true;
  state.socket.connectionClosed = null;
  if (state.socket.opened) {
    state.socket.opened();
  }
}
function SOCKET_ONCLOSE(state) {
  state.socket.client = null;
  state.socket.isConnected = false;
  if (!state.socket.connectionClosed) {
    state.socket.connectionClosed = moment().utc();
  }
}
function SOCKET_ONMESSAGE(state, message) {
  state.lastMessage = message;

  if (message.subscribe && message.subscribe.indexOf('orderBook') > -1) {
    state.socket.subscribedMarket = message.subscribe.substring(message.subscribe.indexOf(':') + 1);
  } else if (message.unsubscribe && message.unsubscribe.indexOf('orderBook') > -1) {
    state.socket.subscribedMarket = null;
  } else if (message.type === 'bookSnapshot') {
    orderBookSnapshotReceived(state, message);
  } else if (message.type === 'bookUpdate') {
    orderBookUpdateReceived(state, message);
  } else if (message.type === 'orderCreated') {
    if (state.socket.orderCreated) {
      state.socket.orderCreated(message);
    }
  } else if (message.type === 'orderMatched') {
    if (state.socket.orderMatched) {
      state.socket.orderMatched(message);
    }
  } else if (message.type === 'orderCreationFailed') {
    if (state.socket.orderCreationFailed) {
      state.socket.orderCreationFailed(message);
    }
  } else if (message.type === 'orderMatchFailed') {
    if (state.socket.orderMatchFailed) {
      state.socket.orderMatchFailed(message);
    }
  } else if (message.type) {
    // unknown message type
    console.log(message);
  }
}

function SOCKET_RECONNECT_ERROR(state) {
  state.socket.reconnectError = true;
}

// Local functions
function normalizeRecentTransactions(transactions) {
  return transactions.map((transaction) => {
    return _.merge(transaction, {
      value: transaction.value.toString(),
      details: {
        vin: transaction.details.vin.map((i) => {
          return {
            value: i.value.toString(),
          };
        }),
        vout: transaction.details.vout.map((o) => {
          return {
            value: o.value.toString(),
          };
        }),
      },
    });
  });
}

