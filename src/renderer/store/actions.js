/* eslint-disable no-use-before-define */
import { neo, wallets } from '../services';

export {
  fetchActiveTransactionDetails,
  fetchHoldings,
  fetchRecentTransactions,
};

function fetchActiveTransactionDetails({ commit, state }) {
  neo
    .fetchTransactionDetails(state.activeTransactionHash)
    .then((data) => {
      commit('setActiveRecentTransaction', data);
    })
    .catch((e) => {
      console.log(e);
    });
}

function fetchHoldings({ commit }) {
  const currentWallet = wallets.getCurrentWallet();

  if (!currentWallet) {
    return;
  }

  neo
    .fetchHoldings(currentWallet.address)
    .then((data) => {
      commit('setHoldings', data.holdings);
    })
    .catch((e) => {
      console.log(e);
    });
}

function fetchRecentTransactions({ commit }) {
  const currentWallet = wallets.getCurrentWallet();

  if (!currentWallet) {
    return;
  }

  neo
    .fetchRecentTransactions(currentWallet.address)
    .then((data) => {
      commit('setRecentTransactions', data);
    })
    .catch((e) => {
      console.log(e);
    });
}
