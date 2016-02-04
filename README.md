# ComicSquirrel
a web comics downloader for Synology NAS

####- Read web comics at your convenience -####
With a comics reader like Challenger Comics Viewer (on Google Play), it is possible to stream comic files on your NAS to your tablet, using Samba. This works for .cbr and .cbz files, but also for .jpg image files. This way you only need to store your comics in one place - on your NAS. Better still, you can use the NAS to automatically download web comics. Let ComicSquirrel do the work of collecting your favorite comics and store them on your NAS, then read them on your tablet in a proper comics viewer!

####- For daily web comics -####
Schedule a regular download of (daily) web comics images to your NAS, to read them later in your favorite comics reader.

####- Missed something? Get the archive -####
Download a series of images within a range, based on a comic's page url - or even based on an image url. Useful for getting some older comics. Hint: also works with the Wayback Machine's image urls!

####- Download web comic images to your NAS -####
Get started by adding your comics library path in Settings. 
ComicSquirrel assumes you have only one folder on your NAS that contains all your comics, i.e. "/volume1/Media/Comics/". If you have multiple libraries, specify the parent folder that contains these, then point to the correct library folder in the "name" input field in the download forms.
The "name" you specify in the download forms will become the comics folder name. This permits you to download to a deeper level, for example: "Girl Genius/Act 2 vol 02" refers to a folder within the Girl Genius folder in your comics library. The downloaded file path will then look like this: "/volume1/Media/Comics/Girl Genius/Act 2 vol 02/ggmain20150119.jpg".

### How to install ComicSquirrel on your Synology NAS ###
1. ComicSquirrel runs on Node.js, so you'll have to install and run that as a package from the Package Centre. 

There is no installer or package file for ComicSquirrel yet. For now you'll have to install this manually, like this: 

2. When you've downloaded these files to your computer, use something like WinSCP to move all the files (except "squirrel.conf") to your NAS, to any location you like. For example, to "/volume1/ComicSquirrel/"
3. Open "squirrel.conf", an upstart script, and change line 18 so it reflects the correct location of these files:       
  ```exec /usr/bin/node /volume1/development/ComicSquirrel/server  --> exec /usr/bin/node /volume1/ComicSquirrel/server```
4. Transfer the "squirrel.conf" file to folder "/etc/init/" on your NAS. 
5. Open a console via WinSCP or Putty, and start the app by typing "start squirrel". 
6. The app can also be stopped using the console, with "stop squirrel"
7. Open a browser, and go to [your NAS IP]:3030 

You should now see the ComicSquirrel app homepage.
