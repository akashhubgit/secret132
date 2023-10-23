const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
// new
const fs = require('fs');
const ffmpegStatic = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const pathtowebsite2 = './website3030/';
//const MemoryStreams = require('memory-streams');
// new
app.use('/static', express.static('./static'));

// Create another Express.js application for the second website
const secondApp = express();

// Replace 'path-to-your-website-directory' with the directory where your second website's files are located
secondApp.use(express.static(pathtowebsite2));

secondApp.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: pathtowebsite2 + 'index.html'
  });
});

// give access to everyone not only localhost cause of the other website
secondApp.listen(3030, '0.0.0.0' , () => {
  console.log("Second website running on http://localhost:3030/");
});

app.listen(3000, () => {
    console.log("It Works!");
});

app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: './'
    });
})


//app.get('/download', (req, res) => {
//    var url = req.query.url;
//    res.header("Content-Disposition", 'attachment; filename="Video.mp4');
//    ytdl(url, {format: 'mp4'}).pipe(res);
//});

app.get('/download', async (req, res) => {
    try {
        var today = new Date();
        var time = today.getDay() + "." + today.getMonth() + "_" + (today.getHours() + 2) + "-";
        const url = req.query.url;
        const downloadType = req.query.downloadType;

        if (downloadType.localeCompare('mp4')) {
            // MP3 Download    

            var stream = ytdl(url, {
                format: 'mp4',
                filter: 'audioonly'
            });

            var videoName = "test";

            const videoInfoPromise = new Promise((resolve) => {
                stream.on('info', (info) => {
                    videoName = info.videoDetails.title.replace(/[#<>$+%!^&*´``~'|{}?=/\\@]/g, '-').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ö/g, 'oe');
                    console.log("Getting: " + videoName);
                    resolve();
                });
            });

            await videoInfoPromise; // Wait for videoName to be updated

            // The rest of your code that depends on the updated videoName
            const inputFilePath = './temp/' + videoName + '.mp4';
            const outputFilePath = './temp/' + videoName + '.mp3';

            await new Promise((resolve, reject) => {
                console.log("Writing: " + videoName + ".mp4");
                stream.pipe(fs.createWriteStream(inputFilePath))
                    .on('finish', resolve)
                    .on('error', reject);
            });

            await new Promise((resolve, reject) => {
                console.log("Converting: " + videoName + " to .mp3");
                ffmpeg()
                    .input(inputFilePath)
                    .output(outputFilePath)
                    .audioCodec('libmp3lame')
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });

            // Send the converted MP3 file for download
            res.download(outputFilePath, videoName + '.mp3', async (err) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    console.log('File sent successfully');
                    // Delete the files after the download is complete
                    const filesToDelete = [
                        './temp/' + videoName + '.mp4',
                        './temp/' + videoName + '.mp3'
                    ];

                    filesToDelete.forEach((filePath) => {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error('Error deleting file:', err);
                            } else {
                                console.log('File deleted successfully:', filePath);
                            }
                        });
                    });
                    fs.appendFile('./logs/success/' + time + videoName + ".txt", "", (err) => {
                        if (err) {
                            console.error('Error writing to log file:', err);
                        } else {
                            console.log('Log entry written to file.');
                        }
                    });
                }
            });


        } else {
            // MP4 Download
            const quality = req.query.videoQuality;


            if (quality.localeCompare('good')) {
                // Bad quality download

                var stream = ytdl(url, {
                quality: 'highest',
                filter: 'videoandaudio'
            });

            var videoName = "test";

            const videoInfoPromise = new Promise((resolve) => {
                stream.on('info', (info) => {
                    videoName = info.videoDetails.title.replace(/[#<>$+%!^&*´``~'|{}?=/\\@]/g, '-').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ö/g, 'oe');
                    console.log("Getting: " + videoName);
                    resolve();
                });
            });

            await videoInfoPromise; // Wait for videoName to be updated

            // Are the same
            const inputFilePath = './temp/' + videoName + '_b' + '.mp4';
            const outputFilePath = './temp/' + videoName + '_b' + '.mp4';

            await new Promise((resolve, reject) => {
                console.log("Writing: " + videoName + '_b' + ".mp4");
                stream.pipe(fs.createWriteStream(inputFilePath))
                    .on('finish', resolve)
                    .on('error', reject);
            });

            // Send the MP4 file for download
            res.download(outputFilePath, videoName + '_b' + '.mp4', async (err) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    console.log('File sent successfully');
                    // Delete the files after the download is complete
                    const filesToDelete = [
                        './temp/' + videoName + '_b' + '.mp4',
                    ];

                    filesToDelete.forEach((filePath) => {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error('Error deleting file:', err);
                            } else {
                                console.log('File deleted successfully:', filePath);
                            }
                        });
                    });
                    fs.appendFile('./logs/success/' + time + videoName + "_b" + ".txt", "", (err) => {
                        if (err) {
                            console.error('Error writing to log file:', err);
                        } else {
                            console.log('Log entry written to file.');
                        }
                    });
                }
            });    

            } else {
                // Good quality download

            var soundStream = ytdl(url, {
                format: 'mp4',
                filter: 'audioonly'
            });

            var videoStream = ytdl(url, {
                format: 'mp4'
            });

            var videoName = "test";

            const videoInfoPromise = new Promise((resolve) => {
                soundStream.on('info', (info) => {
                    videoName = info.videoDetails.title.replace(/[#<>$+%!^&*´``~'|{}?=/\\@]/g, '-').replace(/ä/g, 'ae').replace(/ü/g, 'ue').replace(/ö/g, 'oe');
                    console.log("Getting: " + videoName);
                    resolve();
                });
            });

            await videoInfoPromise; // Wait for videoName to be updated

            // The rest of your code that depends on the updated videoName
            const inputSoundFilePath = './temp/' + videoName + '_s' + '.mp4';
            const inputVideoFilePath = './temp/' + videoName + '_v' + '.mp4';

            const outputFilePath = './temp/' + videoName + '_g' + '.mp4';

            await new Promise((resolve, reject) => {
                console.log("Writing: " + videoName + '_s' + ".mp4");
                soundStream.pipe(fs.createWriteStream(inputSoundFilePath))
                    .on('finish', resolve)
                    .on('error', reject);
            });

            await new Promise((resolve, reject) => {
                console.log("Writing: " + videoName + '_v' + ".mp4");
                videoStream.pipe(fs.createWriteStream(inputVideoFilePath))
                    .on('finish', resolve)
                    .on('error', reject);
            });

            await new Promise((resolve, reject) => {
                console.log("Merging: " + videoName + "to .mp4");
                // Merge audio and video
                ffmpeg()
                    .input(inputVideoFilePath)
                    .input(inputSoundFilePath)
                    .outputOptions('-c:v', 'copy') // Copy video stream
                    .outputOptions('-c:a', 'aac') // Encode audio stream using AAC
                    .outputOptions('-strict', 'experimental') // Enable experimental codecs
                    .save(outputFilePath)
                    .on('end', () => {
                        resolve(); // Resolve the promise when merging is complete
                    })
                    .on('error', (err) => {
                        console.error('Error:', err);
                        reject(err); // Reject the promise if an error occurs
                    });
            });

            res.download(outputFilePath, videoName + '_g' + '.mp4', async (err) => {
                if (err) {
                    console.error('Error:', err);
                } else {
                    console.log('File sent successfully');
                    // Delete the files after the download is complete
                    const filesToDelete = [
                        './temp/' + videoName + '_v' + '.mp4',
                        './temp/' + videoName + '_s' + '.mp4',
                        './temp/' + videoName + '_g' + '.mp4',
                    ];

                    filesToDelete.forEach((filePath) => {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error('Error deleting file:', err);
                            } else {
                                console.log('File deleted successfully:', filePath);
                            }
                        });
                    });
                    fs.appendFile('./logs/success/' + time + videoName + "_g" + ".txt", "", (err) => {
                        if (err) {
                            console.error('Error writing to log file:', err);
                        } else {
                            console.log('Log entry written to file.');
                        }
                    });
                }
            });
        }
    }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Aywa versuch mal nochmal neu (wenn wieder net klappt schick pls Bild an AK)' +
            '\n' + '\n' + '\n' + error);
    }
});



/* new
app.get('/download', (req, res) => {
    var url = req.query.url;
    res.header("Content-Disposition", 'attachment; filename="Video.mp4');
    
    var stream = ytdl(url, {format: 'mp4'})
    var proc = new ffmpeg({source:stream})
    proc.setFfmpegPath('/Applications/ffmpeg')
    proc.saveToFile(mp3, (stdout, stderr)->
            return console.log stderr if err?
      //      return console.log 'done'
     //   )
});
// new 
*/
