import { generateItem, estimateItemValue } from './items.js';

const SELLER_NAMES = ['Kratos','Aragorn','Legolas','Gandalf','Frodo','Sauron','Eowyn','Boromir','Galadriel','Elrond','Xerxes','Zeus','Odin','Loki','Thor'];

const MAX_LISTINGS = 10;

export function createAuction() {
  const auction = { listings: [], myListings: [], nextListingTimer: 3, nextId: 1 };
  for (let i = 0; i < 6; i++) addBotListing(auction, 1);
  return auction;
}

function addBotListing(auction, heroLevel) {
  const item = generateItem(heroLevel);
  const price = Math.floor(estimateItemValue(item) * (1.0 + Math.random() * 0.5));
  const seller = SELLER_NAMES[Math.floor(Math.random() * SELLER_NAMES.length)] + '#' + Math.floor(Math.random() * 9000 + 1000);
  auction.listings.push({
    id: auction.nextId++, item, price, sellerName: seller,
  });
}

export function tickAuction(auction, dt, heroLevel) {
  // Жёсткая обрезка — никогда больше MAX_LISTINGS
  if (auction.listings.length > MAX_LISTINGS) {
    auction.listings.length = MAX_LISTINGS;
  }
  auction.nextListingTimer -= dt;
  if (auction.nextListingTimer <= 0) {
    auction.nextListingTimer = 6 + Math.random() * 6;
    if (auction.listings.length < MAX_LISTINGS) addBotListing(auction, heroLevel);
  }
  for (const l of auction.myListings) {
    if (l.sold) continue;
    l.timeLeft -= dt;
    if (l.timeLeft <= 0) l.sold = true;
  }
}

export function buyListing(auction, listingId, hero, state) {
  const idx = auction.listings.findIndex(l => l.id === listingId);
  if (idx < 0) return { ok: false, reason: 'not_found' };
  const listing = auction.listings[idx];
  if (state.gold < listing.price) return { ok: false, reason: 'no_gold' };
  state.gold -= listing.price;
  hero.backpack.push(listing.item);
  auction.listings.splice(idx, 1);
  return { ok: true, item: listing.item };
}

export function listItem(auction, hero, item, price) {
  const idx = hero.backpack.indexOf(item);
  if (idx < 0) return { ok: false };
  hero.backpack.splice(idx, 1);
  auction.myListings.push({ id: auction.nextId++, item, price, timeLeft: 30 + Math.random() * 30, sold: false });
  return { ok: true };
}

export function sellToBot(hero, item) {
  const idx = hero.backpack.indexOf(item);
  if (idx < 0) return { ok: false };
  const price = Math.floor(estimateItemValue(item) * 0.5);
  hero.backpack.splice(idx, 1);
  return { ok: true, price };
}

export function collectSold(auction, state) {
  let total = 0;
  for (let i = auction.myListings.length - 1; i >= 0; i--) {
    if (auction.myListings[i].sold) {
      total += auction.myListings[i].price;
      auction.myListings.splice(i, 1);
    }
  }
  if (total > 0) state.gold += total;
  return total;
}