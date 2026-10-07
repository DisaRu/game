import { createItem, estimateItemValue } from './items.js';
import { GRADE_ORDER, SLOTS } from './config.js';

const SELLER_NAMES = ['Kratos','Aragorn','Legolas','Gandalf','Frodo','Sauron','Eowyn','Boromir','Galadriel','Elrond','Xerxes','Zeus','Odin','Loki','Thor'];
const MAX_LISTINGS = 10;

function randomItem() {
  const grade = GRADE_ORDER[Math.floor(Math.random() * GRADE_ORDER.length)];
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  const wt = slot === 'weapon' ? (Math.random() < 0.5 ? 'bow' : 'staff') : null;
  return createItem(grade, slot, wt);
}

export function createAuction() {
  const auction = { listings: [], myListings: [], nextListingTimer: 3, nextId: 1 };
  for (let i = 0; i < 6; i++) addBotListing(auction);
  return auction;
}

function addBotListing(auction) {
  const item = randomItem();
  if (!item) return;
  const price = Math.floor(estimateItemValue(item) * (1.0 + Math.random() * 0.5));
  const seller = SELLER_NAMES[Math.floor(Math.random() * SELLER_NAMES.length)] + '#' + Math.floor(Math.random() * 9000 + 1000);
  auction.listings.push({ id: auction.nextId++, item, price, sellerName: seller });
}

export function tickAuction(auction, dt) {
  if (auction.listings.length > MAX_LISTINGS) auction.listings.length = MAX_LISTINGS;
  auction.nextListingTimer -= dt;
  if (auction.nextListingTimer <= 0) {
    auction.nextListingTimer = 6 + Math.random() * 6;
    if (auction.listings.length < MAX_LISTINGS) addBotListing(auction);
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
export function cancelListing(auction, hero, listingId) {
  const idx = auction.myListings.findIndex(l => l.id === listingId);
  if (idx < 0) return { ok: false, reason: 'not_found' };
  const l = auction.myListings[idx];
  if (l.sold) return { ok: false, reason: 'sold' };

  const item = l.item;
  const cnt = item.count || 1;

  // Возвращаем в рюкзак: стакаем с существующим
  const existing = hero.backpack.find(x =>
    x.kind === item.kind &&
    x.id !== item.id &&
    (item.kind !== 'buff' || x.buffType === item.buffType) &&
    (item.kind !== 'book' || x.skillId === item.skillId) &&
    (item.kind !== 'blessed' || x.kind === 'blessed') &&
    (item.kind !== 'pass' || x.kind === 'pass')
  );
  if (existing && (item.kind === 'buff' || item.kind === 'book' || item.kind === 'blessed' || item.kind === 'pass')) {
    existing.count = (existing.count || 1) + cnt;
  } else {
    hero.backpack.push(item);
  }

  auction.myListings.splice(idx, 1);
  return { ok: true, item, quantity: cnt };
}

export function listItem(auction, hero, item, price, quantity = 1) {
  const idx = hero.backpack.indexOf(item);
  if (idx < 0) return { ok: false };

  const cnt = item.count || 1;
  const qty = Math.max(1, Math.min(quantity, cnt));

  let listingItem;
  if (cnt > qty) {
    // Стек: списываем qty, клонируем для лота
    item.count = cnt - qty;
    listingItem = { ...item, count: qty, id: item.id + Math.random() };
  } else {
    // Забираем всё, что есть (cnt === qty)
    hero.backpack.splice(idx, 1);
    listingItem = item;
    listingItem.count = qty;
  }

  auction.myListings.push({
    id: auction.nextId++,
    item: listingItem,
    price,
    timeLeft: 30 + Math.random() * 30,
    sold: false,
  });
  return { ok: true, listed: qty, price };
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