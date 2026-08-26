function normalizeName(name) {
  return name.trim().toLocaleLowerCase('pl-PL');
}

const item = { name: 'Telefon komórkowy (cegła)' };
const set = new Set([normalizeName('Telefon komórkowy (cegła)')]);
console.log(set.has(normalizeName(item.name)));
