cat-dns
=======

The internet needs more cats. DNS servers are the authority on all things internet. Therefore, the best DNS server is the one that resolves everthing to cats. Guess what kind of DNS server this is (Hint: it's the cat kind).

### Making it go

Before you do anything, you need to install node packages:
```
npm install
```

To run, start the server as a privileged process. This is because to be a DNS server, you need to be a UDP server on port 53. This is a small numbered port, which means it needs superpowers (however these are dumped once started). This is how your run it: 

```
sudo node cat-dns.js
```

By default, cat-dns will run attached to the `localhost` address. To bind this to a specific IP address on your host run:

```
sudo node cat-dns.js --address 192.168.1.10
```

Be careful running this on network addresses other than localhost. Other
machines with access to the host you bind to can make DNS queries. For
instance, binding to `0.0.0.0` and exposing your machine to the internet
will allow anyone with access to the internet to make DNS queries to your
machine.

To run on your local system, you need to somehow set your DNS server to be localhost. On a Mac, I do this by creating a new (wi-fi) interface (called Cats), in my Network preferences, and settings its DNS server to `127.0.0.1`. You could do this on your normal interface, but as a warning, while you're playing with this, pretty much nothing on your computer that requires the internet works. Except for your browser. And then that's mostly cats. So being able to deactivate it easily is kind of key (I know. You might think 'Why would I ever want to deactivate cats?', but trust me on this one). I also recommend killing all the things that need to call the mothership (google hangouts, twitter feeds, dropbox, iMessage), because they will not like your sassy cat answers, and will slow everything down.

### You are ready
Go in your browser to `www.google.com` and wait a bit. You should see a cat. Go to a different website. Another cat. Congratulations. Your internet is now all cats.

### Wait what?
Do not panic. While I recommend you don't look at the source because it's gross, if you do look at the source, you'll notice all it does is resolve any hostname to `104.131.51.57` (or whatever `cats.nanobit.org` actually resolves to, as it keeps changing), which is a magical place on the internet that has cats. You could also resolve everything to localhost, and serve your own cats on an http server on port 80. But then you'd have to store your own cats locally, and that is animal cruelty. Thankfully, for now, while that magical static IP exists, you don't have to. 
That's it, that's all. 

### <3,
monica
