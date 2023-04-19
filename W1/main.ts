import { createReadStream, writeFileSync } from "fs";
import { createInterface } from "readline";

async function main() {
  const wordsArg = process.argv.indexOf("--words");
  const words = createInterface({
    input: createReadStream(
      wordsArg === -1 || process.argv.length < wordsArg
        ? "words.txt"
        : process.argv[wordsArg + 1]
    ),
    crlfDelay: Infinity,
  });
  const cv: Record<string, number> = {};

  const ngramsArg = process.argv.indexOf("--ngrams");
  const ngramLengths =
    ngramsArg === -1 || process.argv.length < ngramsArg
      ? [2, 3]
      : process.argv[ngramsArg + 1].split(",").map(parseInt);

  const ngrams: Record<string, number>[] = [];

  const lengths: number[] = [];
  for await (const word of words) {
    const trimmed = word.trim();
    if (trimmed.length === 0 || !trimmed.match(/.{5}/)) continue;

    const cvIndex = word
      .replaceAll(/[aeiouäöü]/g, "V")
      .replaceAll(/[^V]/g, "K");

    cv[cvIndex] ??= 0;
    cv[cvIndex] += 1;

    for (const ngramLength of ngramLengths) {
      ngrams[ngramLength] ??= {};
      for (let i = 0, wordLength = word.length; i < wordLength; ++i) {
        const digram = word.substring(i, i + ngramLength);
        if (digram.length === ngramLength) {
          ngrams[ngramLength][digram] ??= 0;
          ngrams[ngramLength][digram] += 1;
          lengths[ngramLength] ??= 0;
          ++lengths[ngramLength];
        }
      }
    }
  }

  const top10Cv = Object.entries(cv).sort((a, b) => b[1] - a[1]);
  const top10Lang = ngrams.map((ngram, ngramLength) =>
    Object.entries(ngram)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, v) => {
        obj[v[0]] = `${((v[1] / lengths[ngramLength]) * 100).toFixed(2)}%`;
        return obj;
      }, {} as Record<string, string>)
  );

  console.log("CV", top10Cv);
  console.log("lang", top10Lang);
  writeFileSync("processed.json", JSON.stringify(top10Cv, null, 2));
  writeFileSync("lang.json", JSON.stringify(top10Lang, null, 2));
}
main();
