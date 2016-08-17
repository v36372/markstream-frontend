MarkStream.controller('MainController',['$scope','$timeout','$interval','decode',function($scope,$timeout,$interval,decode){
    var ws = new WebSocket("ws://localhost:8081/stream");
    ws.binaryType = 'arraybuffer';
    var audio_context =  new AudioContext();

    $scope.imgIcon = "play-icon.svg";

    ws.onopen = function(){  
    };

    var queue = [];
    
    var embedd = false;

    var intervalPromise;
    $scope.play = function(){
        if ($scope.imgIcon == "pause-icon.svg"){
            return;
        }
        $scope.imgIcon = "pause-icon.svg";
        $timeout(function(){
            startTime = audio_context.currentTime+0.5;
            intervalPromise = $interval(Process, 400);
        },500);
    };

    $scope.watermarks = [];
    $scope.link = [];

    ws.onmessage = function (event) {
        var frame = new Int16Array(event.data);
        var floatframe = {};
        floatframe.buffer = new Float32Array(frame.length);
        for(var i=0;i<frame.length;i++){
            floatframe.buffer[i] = frame[i]/32767;
        }
        var promise = decode.QIMDecode(floatframe.buffer);
        promise.then(
            function(payload){
                if(payload != null && payload.length > 0)
                    floatframe.wm = payload;
            },
            function(errorPayload){
            });

        queue.push(floatframe);
    };

    var Process = function(){
        if(queue.length==0)
        {
            return;
        }

        var audioChunk = queue[0].buffer;
        var audioBuffer = audio_context.createBuffer(1, 22050, 44100);
        audioBuffer.getChannelData(0).set(audioChunk);

        var source = audio_context.createBufferSource();
        source.buffer = audioBuffer;
        source.start(startTime);
        source.connect(audio_context.destination);
        startTime += audioBuffer.duration;
        if(queue[0].wm != null){
            source.wm = queue[0].wm;
            source.onended = function(){
                
                var wm = this.wm;

                if($scope.watermarks.length >0 && $scope.watermarks[$scope.watermarks.length-1].lastIndexOf('\n') == -1)
                    $scope.watermarks[$scope.watermarks.length-1] += wm;
                else if(wm.length > 0 && wm[0] == '1')
                    $scope.watermarks.push(wm.substr(1,wm.length-1));
                    if ($scope.watermarks.length > 0 && $scope.watermarks[$scope.watermarks.length-1].lastIndexOf('\n') != -1)
                        $scope.link[0] = $scope.watermarks[$scope.watermarks.length -1];
            };
        }
        queue.shift();
    };
    var startTime;
    var closed = false;

    ws.onclose = function () {
        closed = true;
        $interval.cancel(intervalPromise);
    };
}]);
