<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./public/logo-dark.webp">
    <source media="(prefers-color-scheme: light)" srcset="./public/logo-light.webp">
    <img src="./public/logo-light.webp" height="72" alt="Seqout">
  </picture>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/license-BSD--3--Clause-blue" alt="License">
  <img src="https://img.shields.io/github/actions/workflow/status/saketlab/seqout-web/deploy.yml" alt="Build Status">
  <img src="https://img.shields.io/github/last-commit/saketlab/seqout-web" alt="Last Commit">
</p>
<p align="center">
  <a href="https://seqout.org/"><img src="https://img.shields.io/badge/seqout.org-276DC3?logo=googlechrome&logoColor=white" alt="seqout.org" height="26" style="border:0;vertical-align:middle"></a>
  <a href="https://seqout.org/cli/R/"><img src="https://img.shields.io/badge/R%20package-276DC3?logo=r&logoColor=white" alt="R package" height="26" style="border:0;vertical-align:middle"></a>
  <a href="https://seqout.org/cli/python/"><img src="https://img.shields.io/badge/Python%20client-276DC3?logo=python&logoColor=white" alt="Python client" height="26" style="border:0;vertical-align:middle"></a>
  <a href="https://seqout.org/cli/"><img src="https://img.shields.io/badge/CLI-276DC3?logo=gnometerminal&logoColor=white" alt="CLI" height="26" style="border:0;vertical-align:middle"></a>
  <a href="https://seqout.org/mcp/"><img src="https://img.shields.io/badge/MCP-276DC3?logo=modelcontextprotocol&logoColor=white" alt="MCP" height="26" style="border:0;vertical-align:middle"></a>
</p>

Seqout is a search engine for finding genomic datasets across NCBI, EMBL-EBI, CNCB-NGDC & DDBJ portals. To learn more about how search works, [read more](https://seqout.org/howsearchworks).

## Harmonised sample metadata

Seqout harmonises heterogenous sample metadata into fifteen standardised attributes across different datasets hosted in different databases. This is available under the "Enriched" tab.

![Eniched samples screenshot](./screenshots/enirched.png)

## Semantically similar datasets

Apart from text-based search, Seqout also offers dataset discovery via semantic similarity using vector embeddings.

![Semantically similar datasets screenshot](./screenshots/neighbors.png)

We also have an embedding similarity-based 2D map of datasets across seven repositories. Visit [seqout.org/map](https://seqout.org/map).

![2D map screenshot](./screenshots/map.png)

## Connect with AI agents

Seqout also has an MCP server to help work with genomic datasets using AI agents (such as Claude, Codex, Antigravity etc.). Visit [seqout.org/mcp](https://seqout.org/mcp) for more information.

[![Available on Claude](https://img.shields.io/badge/Available_on-Claude-D97757?style=for-the-badge&logo=claude&logoColor=white)](https://claude.ai/directory/seqout)

## CLI, Python & R packages

The `seqout` package is available via PyPI. For docs, go here: https://seqout.org/cli/python/. This can be used as both CLI command and a Python package.

[![PyPI](https://img.shields.io/pypi/v/seqout?style=for-the-badge&logo=pypi&logoColor=white)](https://pypi.org/project/seqout/)

Documentation for the R package is available at: https://seqout.org/cli/R

## Issues & support

Found a bug or have a feature request? Please use [GitHub Issues](https://github.com/saketlab/seqout-web/issues).

## License

[BSD-3-Clause license](https://github.com/saketlab/seqout-web?tab=BSD-3-Clause-1-ov-file)

## Citation

If you have found Seqout helpful for your research, please cite us with the following:

```bib
@misc{seqout,
  author = {Mukherjee, Aniruddha and Reddy, Mukesh and Choudhary, Saket},
  title  = {Seqout: metadata harmonisation for genomics dataset discovery},
  year   = {2026},
  url    = {https://seqout.org},
}
```
