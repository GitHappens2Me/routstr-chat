import { getEncodedTokenV4 } from "@cashu/cashu-ts";

const token = {
      "mint": "https://mint.minibits.cash/Bitcoin",
      "proofs": [
        {
          "id": "00107937db0cc865",
          "amount": 4,
          "secret": "86f8cbd31a8a822a3f500eeff1a521da83365a635c2d516f44abf6d342f433ca",
          "C": "029e38b5b1ad9285e8c74e5eb584e806a499be60897ed3a5968ba8e54c34ad704d",
          "dleq": {
            "s": "7c37f9b7e75df3007996afdfdb07ba67c5fe90bb241d974cce9d3311e5cc6c0a",
            "e": "9af4de6c4eecd894b61538f46d5b759ad38e0002756f1c9472d6c773ead10f5d",
            "r": "e802db59b6ba8c0d401cbe91025bcb19416f7397cba3fef6ff088bf6b0b16128"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA",
          "createdByOperationId": "gDfQK7FLqEtYjjUD7xqIqA"
        },
        {
          "id": "00107937db0cc865",
          "amount": 32,
          "secret": "ea1ec2ee695e6b6f2e0d8df105105ccba5d3a1cd33dd98bd87ce9209524e72c0",
          "C": "02550d718eb1501573e1867ff7885a892c515b824edb5f47ad99930f2efcbe9d51",
          "dleq": {
            "s": "640ca63014a5dd1913eabdce199b07b47cf31ac2491d4b3fd39bad5fe2943060",
            "e": "8b1144a89290ae8457aac1cbc389170eddc6f57f9de34a3d5aea56d700299f3f",
            "r": "d0ed4159f2b9abee00f4bcd98500a783d4f46e5aa7b91de6a0c6473560fd08ea"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA"
        },
        {
          "id": "00107937db0cc865",
          "amount": 4,
          "secret": "f025852fe7c6709a89cb34c960d1fe923049d42e8d779bdd562585c830bcbda2",
          "C": "02d4b62cf33bcdfb90640b3119c31ab1c52dc7500ecfeb57d13072697b011c746a",
          "dleq": {
            "s": "16cf74b61e1d5f26eb3bcdc07136d1a0aaa03087a7d904fa00c88b0823e52038",
            "e": "7971d3dff66d9f154506645cf36569898d33443d1b425bdb373dfa28340f0edc",
            "r": "579f80c69ea6931941514beca0be8475c35f8361404fa4bb2f7e0ff040d50f94"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA"
        },
        {
          "id": "00107937db0cc865",
          "amount": 1024,
          "secret": "1c706aabc1170f7eb6421d9d8f158fc52eb3b25ca8b54ea279e7a0a5c97ae8bb",
          "C": "02fd7e8b6250aef68f6dda468518308e0267a9a967fc8f6096969bcde1db495c0b",
          "dleq": {
            "s": "8947dc35d7064753bda31bfdcaf5f7ad72f5c365a6ca8ee3dc7988bf729eb892",
            "e": "0e685b9ab956cf681e6b6a1627470375da4712615352cc68b7d59f4756ce0bb3",
            "r": "186f9a4acc717852e88743aef562e00e37ba1b297ac2a4886f4bac94a168b2fa"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA",
          "createdByOperationId": "l6h1vhSPn-qfbboTFdeSrQ"
        },
        {
          "id": "00107937db0cc865",
          "amount": 512,
          "secret": "322e62a7a3ff7157a2c63b2b8d20cd267e293b205980d77b826feac1b0d3f32c",
          "C": "035530214782ca38be6242ed2f31814ef22edf4e4701e565d47873239687761f20",
          "dleq": {
            "s": "cc9031fb01357d1800a89f4f86889751ae18c476ba5c8fccaf09d1b1ae7205aa",
            "e": "cc8aa2947c6f4de0c47f98165d5eff7d58ae2c8980833518ab4375cebd4b0ee3",
            "r": "aed3abe365a54c0a621232cc7132932e227bee3e7cced616e6de90dd5bf65c56"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA",
          "createdByOperationId": "l6h1vhSPn-qfbboTFdeSrQ"
        },
        {
          "id": "00107937db0cc865",
          "amount": 256,
          "secret": "244c4d4cee5ccc4e67154b1cd4537366a9e2e2bc09c493c900292eeb84f09a51",
          "C": "02d09bd433d4d6ccb2e3e474113bdd2933dbe8819d67ddfa652a22a8e6d1c55950",
          "dleq": {
            "s": "8137c95494a932f637f3ea7474e6fd120a90dccf5b6ed296414185262402a9a9",
            "e": "818ac5622e11f1f291d004aa5e373018b69d9f1742c67c4bfb7c7a5451b2ee56",
            "r": "380037f42a0cbbf23a2e6929171176ec45642fd8c63f5f2ab312189cfb7a1fa5"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA",
          "createdByOperationId": "l6h1vhSPn-qfbboTFdeSrQ"
        },
        {
          "id": "00107937db0cc865",
          "amount": 4,
          "secret": "fd6c567d1cc3a9616d749bd007ccd6a81830bd3e56bbe466ddc475c5d2da0a9a",
          "C": "02f68fe8b208e99274502aaf3361f342fa2d8628bd50e3b4baa88929ad5c23c9b1",
          "dleq": {
            "s": "da68b4bb8ef5fe2070f85fabb939de7eab9bb32c7027d303315d5c169783c359",
            "e": "1224e2a9c6383501a5d97f1f6643ec1b029fc037559a1ee74ab8e1a5b3afed6b",
            "r": "c2271ffcbdb159c4173885872f1cd74e63c248c4559375f5a3f66dd0f2f0b197"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA",
          "createdByOperationId": "l6h1vhSPn-qfbboTFdeSrQ"
        },
        {
          "id": "00107937db0cc865",
          "amount": 2048,
          "secret": "689eca23d47c15588e5404f4cc4f004b07a772081e1049bdcf47587d9c4cdf52",
          "C": "03521f7f3d4e41ff34ed9380f6cd3e02fcdeed1175339fd449c168c80683828af9",
          "dleq": {
            "s": "2b1be15fde0e2dfdab5d59f3b3d18716183f0e8d7c4e9fac09c11a5e5a58400b",
            "e": "fdfd656b40cef7d38358e3f3f79790b01b9904a781cc6f231f2b64c7c3309fd5",
            "r": "5da9fcd91c9984e33aae426e49e87268c406c6a99b9e7623faefe70aa09cefed"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA"
        },
        {
          "id": "00107937db0cc865",
          "amount": 1024,
          "secret": "882c079de688558231acb741c80f99a8b59f62a2def8049dfaee5b3ec3824b86",
          "C": "021bc2655be6e563d3ee97ab8f0e60ea09599cd790e84550bb4f42cc4abc2a14f2",
          "dleq": {
            "s": "6229a16496a8c82f63e9b2811ea9576efe48a480477477d9d7b38477aa966c47",
            "e": "da4f4731732d7df31906894296fe70189dc7321f169bef2c1f308453158cdc99",
            "r": "8c3033eb3bb42892290ac026966fb0e3792c03d7378221fceeb71e058fa153cd"
          },
          "mintUrl": "https://mint.minibits.cash/Bitcoin",
          "state": "ready",
          "usedByOperationId": "YHxatTwy8LaCt0j8jzMhgA"
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
