import { getEncodedTokenV4 } from "@cashu/cashu-ts";

const token = {
      "mint": "https://mint.minibits.cash/Bitcoin",
      "proofs": [
        {
          "id": "00107937db0cc865",
          "amount": 4,
          "secret": "85692d5fac51eb57751e0fa1a909f5612ba8c6349a536e7868c379edee5e0f92",
          "C": "03abee5194d11d67e04687287fc57b4ae2514e6abefaf60418280adba0c1d68efe",
          "dleq": {
            "s": "d360fcd6e4f98805d51bc6f0c9904295f2e06a6ae57c32408f1a518cc27e6265",
            "e": "870f3a53a27ed6cdaff8c4dbaa64e6eec5af13cf94eb666c2e08c55bcea6101c",
            "r": "8e8d3dea753ce5b7678306b50b27587d78dbbdb63e95588be0007a6bfd8ce57a"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "A_Vl4cjVfpi0w1upNm-q9g"
        },
        {
          "id": "00107937db0cc865",
          "amount": 4,
          "secret": "13b9520816dcfcc9a193af29bbf2714b37323b8f632f3288a653f789312239bf",
          "C": "03489a8658396334c97aca028311d84ff468d7edb0833d3c31eb222e87434d9da9",
          "dleq": {
            "s": "cc3b2b307b3e1aed1d44e4d45a05ddff3630fed58b7bedcb0d738a91e042f42c",
            "e": "dd5643b4acb26b445e075ec27fb8fc36518702612d90ea48441c9f3ade690321",
            "r": "53023e55e7162c09d27314d50d37108a24ff87acb39cfd42ba3004dd8e523c76"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "A_Vl4cjVfpi0w1upNm-q9g"
        },
        {
          "id": "00107937db0cc865",
          "amount": 2,
          "secret": "020f32d393d84e99e3ebd0db595a8c447db89d1ed4a0cd2cb10c1f2ed959826e",
          "C": "03b9ce39c7f4d26cae7f0c0bdbcfd8785341dd67a71f85bdcf505f1b7c771e3d64",
          "dleq": {
            "s": "67560de66c2f1e15c03f619b61d523cc46b9fa0fd5f54e550f3e9d6b4b7ca9d9",
            "e": "8f2090d216882a6540dc52240f813125bec07a6c8e548c2e15793aab152b5f32",
            "r": "a3c3367e36b003918733b3971fdcc4e01bc87e6fde9ebb4bc40c6c4fd88be782"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "A_Vl4cjVfpi0w1upNm-q9g"
        },
        {
          "id": "00107937db0cc865",
          "amount": 8,
          "secret": "028ec8693ec3ad3fedc65def493010fa0eaa567b8bbcfd9602e746e2bc606018",
          "C": "02093f29ac860db009484a9c82292ac10d7e9a5f60c6926f6034188a8adcdaae37",
          "dleq": {
            "s": "b0d4b419dfe9548968c49db8ba24d34e8e2cd0b8d9a2236af9a1297b9d144236",
            "e": "604d476b0258f7162b24606820624f7999b34dba03ee101b82b4ab91efc6be0a",
            "r": "7ce2e26c020a88b244c618b024f9e9ed877ac2b9dd7c948c7363693f738d5cdf"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "A_Vl4cjVfpi0w1upNm-q9g"
        },
        {
          "id": "00107937db0cc865",
          "amount": 128,
          "secret": "71ae09ef9ae440a0fc41957dd543d3a733556532981be7ad678bbe13a009f0bf",
          "C": "024c15cf9f15312b3ef4b23ca4e038b98823dfdb36fd7395abe252a8908f493fe4",
          "dleq": {
            "s": "ee1f6c16311ac0d1f7733e2da2d8496e1b99b0c9a31c6600da72b363816ead75",
            "e": "ccaa7bbc77af2146cd7991c85c7f674e3e1d317afd6bea1c7dc61b4ec6e626ad",
            "r": "b325e00da43cd70a5b5c36fcf41bb06e4fcb53e6ab8ef5355adaa4c33d846b4d"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "A_Vl4cjVfpi0w1upNm-q9g"
        },
        {
          "id": "00107937db0cc865",
          "amount": 32,
          "secret": "2a543070a499c1e765bb64d05ff872e5fd66c13f26aae19e28cbce6ac71a7e85",
          "C": "0314118abe39fa74be0b9174117cffc09ea27d52a616f647b73cc46d87bfd94583",
          "dleq": {
            "s": "bb444db6deac0bc5b0a4240af4ed88706dafe3ffef75ef784784a2bd5f793e3f",
            "e": "1fe0a9e11daab2855bbd5b18bea0f7c069a451e87fde6780f2ed11d373c4cfc4",
            "r": "ddf158810199cd1a076b9dfd4022847c53cea285bc5caf7114bde1932d7a9325"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "A_Vl4cjVfpi0w1upNm-q9g"
        },
        {
          "id": "00107937db0cc865",
          "amount": 8,
          "secret": "68e5c52fc425e4af107ddfc0be5acccf86fd00e56c0462147e95372824cfe432",
          "C": "0263da6fb332bc5ebb35ad8c1f9dd54a47f994d05351babf9e2a23866ec1ac043f",
          "dleq": {
            "s": "005c9867232383ee55c11ea8dfda13356909b94472120d5af7eac497afd9d1a7",
            "e": "1e2e49f32b5c209517e1751f4218ad78832455e378cf32d4a3eab84109e2078c",
            "r": "fade1bd12ba8d50f2487dc873096825bccdcee085f9e7d212a43bc846e7e09ae"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "A_Vl4cjVfpi0w1upNm-q9g"
        }
      ],
      "unit": "sat"
    }

const encoded = getEncodedTokenV4({
  mint: token.mint,
  proofs: token.proofs.map((p) => ({
    id: p.id,
    amount: p.amount,
    secret: p.secret,
    C: p.C,
  })),
  unit: token.unit,
});

console.log(encoded);
