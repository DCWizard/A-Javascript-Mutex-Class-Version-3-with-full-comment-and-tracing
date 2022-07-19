var TheCopyRightNotice          = `Copyright © 2020-2022 Denis Cote ThinknSpeak`;

class Mutex {
  constructor() {
    // PRIVATE :
    var _Lock                   = Promise.resolve();
    var LockStack               = [_Lock];
    
    var _DEBUGTRACE             = true;
    var NameThisObject          = function (ThisObject, ThisName){
      Object.defineProperty(ThisObject, 'name', {
        value: ThisName,
        configurable: true,
      });
    }
    NameThisObject (_Lock, "Init_NextLock");
    _Lock["State"]              = "fulfilled"; 

    // PUBLIC :
    this.IsLocked               = function (){
      // UNFORTUNATELLY WE DON'T HAVE ACCESS TO Promise::<state> NOT EVEN READONLY PROVIDED BY AND THANKS TO MOLTON BORONS. 
      // BUT THE DEBUGGER CAN: SIMPLIFYING BY MAKING IT WORST 
      // SO, WE HAVE TO DO THIS STUPID CONTRACTION INSTEAD;
      // LOOK BELOW FOR GetThatFulfilledState HAS IT RECORDS THE FULFULL STATE 
      // UNFORTUNATELLY IT RECEIVED THE EVENT TOO LATE (NOT ACCURATE ENOUGH)
      // if(_Lock["State"]        == "pending"){
      //   return true;
      // }
      // return false;

      // Promise.any(LockStack).then((value) => console.log("ANY OF: ", value)); 
      // AGAIN! IN A FUCKIN' THEN() CAN'T THEY JUST CHECK AND RETURN THE RESULT RIGHT AWAY.
      // IT SHOULDN'T BE THAT HARD TO LOOK AT A STACK. LOOK AT MINE BELOW
      // THIS IS AS STUPID AS THE MORONS WHO WROTE THIS. +AS IT'S RETURNING THE FIRST ONE. 
      // SO, I'M GONNA DO IT RIGHT...

      // ONE WAY WE CAN DO IS CHECK THE LAST STATUS ON THE (OUR) STACK... 
      // NOT MY CHOICE I WOULD HAVE PREFERRED THAT THEY WOULD HAVE DONE A GOOD JOB.
      let ThisLastLock          = LockStack[LockStack.length - 1];
      if(ThisLastLock["State"] == "pending"){
        return true;
      }
      return false;
    }
    var _acquire                = function (ThisName) {
      var release;
      const ThisLock = _Lock   = new Promise(resolve => {
          release = resolve;
      });
      NameThisObject (ThisLock, ThisName + "_NextLock");
      ThisLock["State"]        = "pending";
      function GetThatFulfilledState (ThatLock){
        ThatLock.then(()=>{
          ThatLock["State"]    = "fulfilled";
        });
      }
      GetThatFulfilledState       (ThisLock);
      NameThisObject (release,    ThisName + "_NextRelease");
      release["State"]          = "pending";
      LockStack.push              (release);
      return release;
    }
    this.AcquireNextLock        = function (ThisName) {
      const  ThisQ              = _Lock.then(() => 
      // release
      // OR... THE SAME AS...
      {
        return release; // RETURN THE .then() RESULT PROMISE  = AcquireNextLock(ThisName).then( (parm) => This release)
        // This release =  await this.AcquireNextLock(ThisName); 
      });
      const  release            = _acquire.call(this, ThisName);
      NameThisObject              (ThisQ, ThisName + "_NextThen");
      ThisQ["State"]            = "pending";
      LockStack.push              (ThisQ);
      return ThisQ;  // RETURN THE .then PROMISE (WITHOUT await) =  TheNextPromise = this.AcquireNextLock(ThisName); TheNextPromise.then(...)
    }
    this.AwaitExecute           = async function (ThisName, ThisCallBack) {
      if(_DEBUGTRACE){console.log(ThisName + " Requesting lock");}
      let ThisRet = null;

      let ThisUnlockFnc         = await this.AcquireNextLock(ThisName); 

      if(_DEBUGTRACE){console.log(ThisName, ThisUnlockFnc, "acquired lock");}
      for(let Each           in LockStack){
        let ThatLock          = LockStack[Each];
        console.log(ThatLock.name + " Status:", ThatLock, ThatLock.State);
      }
      
      if(typeof ThisCallBack  === 'function'){
        if(_DEBUGTRACE){console.log(ThisName, "Executing with", ThisUnlockFnc, "On this", ThisCallBack);}
        ThisRet                 = await ThisCallBack.call(this, ThisName, ThisUnlockFnc);
      }
      ThisUnlockFnc.State       = "fulfilled";
      ThisUnlockFnc(ThisRet); 
      if(_DEBUGTRACE){console.log(ThisName + " Released lock with ", ThisRet, "IsLocked:", this.IsLocked());}
    }
    this.Execute                = async function (ThisName, ThisCallBack) {
      if(_DEBUGTRACE){console.log(ThisName + " Requesting lock");}
      let ThisRet = null;

      let ThisNextLock          = this.AcquireNextLock(ThisName);
      ThisNextLock.then(async ThisUnlockFnc => {
        if(_DEBUGTRACE){console.log(ThisName, ThisUnlockFnc, "acquired lock");}
        for(let Each           in LockStack){
          let ThatLock          = LockStack[Each];
          console.log(ThatLock.name + " Status:", ThatLock, ThatLock.State);
        }
        
        if(typeof ThisCallBack  === 'function'){
          if(_DEBUGTRACE){console.log(ThisName, "Executing with", ThisUnlockFnc, "On this", ThisCallBack);}
          ThisRet                 = await ThisCallBack.call(this, ThisName, ThisUnlockFnc);
        }
        ThisUnlockFnc.State       = "fulfilled";
        ThisNextLock["State"]     = "fulfilled"; 
        // NOTICE: NOT THE LAST LOCK: IsLocked() STILL ["State"] = "pending"
        ThisUnlockFnc(ThisRet); 
        if(_DEBUGTRACE){console.warn(ThisName + " Released lock with ", ThisRet, "IsLocked:", this.IsLocked());}
      }); 
    }
  }
}

// /*
const WaitDelay = ThisDelay => new Promise(resolve => {
  setTimeout(resolve, ThisDelay);
});

const TheMutex              = new Mutex();
async function Executor (ThisName, ThisLock){
  console.log(ThisName + " Running...", (ThisLock), ThisLock.name, "is", ThisLock.State, "IsLocked:", this.IsLocked());
  await WaitDelay(10000);
  return ThisName + " Succeeded";
}

TheMutex.Execute("A", Executor);
TheMutex.Execute("B", Executor);
TheMutex.Execute("C", Executor);
TheMutex.Execute("D", Executor);

// */
