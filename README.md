cat-dns
=======

The internet needs more cats


### Making it go

Before you do anything, you need to install two node packages:
```
npm install node-bitarray
npm install ip
```

To run, start the server as a privileged process. This is because it's serving both a UDP server on port 53, and a regular, http server (for the cats), on port 80. Since they're small numbered ports, they need superpowers:
```
sudo node cat-dns.js
```
Now go in your browser to `www.google.com` and wait a bit. You should see a cat. That's it, that's all.
