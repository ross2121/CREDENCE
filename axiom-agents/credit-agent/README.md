# AXIOM Credit Agent

Local QVAC-style credit agent scaffold.

The agent:

- fetches or accepts GoldRush-style wallet history
- builds a credit feature vector
- scores the wallet locally
- maps score to AXIOM credit tier terms
- generates a deterministic proof payload for the ZK circuit/scaffold
- builds SDK calls for proof registration and loan requests
