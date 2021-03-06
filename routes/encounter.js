'use strict';

const { Router } = require('express');
const router = new Router();
const routeGuard = require('./../middleware/route-guard');
const Event = require('./../models/event');
const gameList = require('./../variables');
const Post = require('./../models/post');
//get methods
//encounter index
router.get('/', (req, res, next) => {
  let postSide;
  let eventsSide;
  Post.find()
    .sort({ timestamp: 'descending' })
    .limit(2)
    .then(documents => {
      postSide = documents;
      return Event.find()
        .sort({ creationDate: 'descending' })
        .limit(3);
    })
    .then(something => {
      eventsSide = something;
      return Event.find().populate('host waitingList');
    })
    .then(encounters => {
      // console.log(encounters);
      res.render('encounter/index', { encounters, postSide, eventsSide });
    })
    .catch(error => next(error));
});

//create event
router.get('/create', routeGuard, (req, res, next) => {
  let postSide;
  let eventsSide;
  Post.find()
    .sort({ timestamp: 'descending' })
    .limit(2)
    .then(documents => {
      postSide = documents;
      return Event.find()
        .sort({ creationDate: 'descending' })
        .limit(3);
    })
    .then(something => {
      eventsSide = something;
      res.render('encounter/create', { gameList, postSide, eventsSide });
    });
});

//show single event
router.get('/single/:id', routeGuard, (req, res, next) => {
  const id = req.params.id;
  let postSide;
  let eventsSide;
  Post.find()
    .sort({ timestamp: 'descending' })
    .limit(2)
    .then(documents => {
      postSide = documents;
      return Event.find()
        .sort({ creationDate: 'descending' })
        .limit(3);
    })
    .then(something => {
      eventsSide = something;
      return Event.findById(id).populate('host waitingList');
    })
    .then(singleEvent => {
      singleEvent.players = singleEvent.waitingList.splice(singleEvent.numberOfPlayer);
      res.render('encounter/single', { singleEvent, postSide, eventsSide });
    })
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//edit single event
router.get('/single/:id/edit', routeGuard, (req, res, next) => {
  let postSide;
  let eventsSide;
  Post.find()
    .sort({ timestamp: 'descending' })
    .limit(2)
    .then(documents => {
      postSide = documents;
      return Event.find()
        .sort({ creationDate: 'descending' })
        .limit(3);
    })
    .then(something => {
      eventsSide = something;
      return Event.findById(req.params.id).populate('host');
    })
    .then(singleEvent => {
      singleEvent.total = gameList; //in order to pass the total value of the list
      res.render('encounter/edit', { singleEvent, postSide, eventsSide });
    })
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//join the event
router.get('/single/:id/join', routeGuard, (req, res, next) => {
  //here we will verify if the user already joined and only allow it of he didn't
  const eventId = req.params.id;
  const userId = req.user._id;
  Event.findById(eventId)
    .then(event => {
      const isTheUserJoined = event.waitingList.find(x => {
        return x.toString() === userId.toString();
      });
      if (!isTheUserJoined) {
        return Event.findByIdAndUpdate(
          {
            _id: eventId
          },
          {
            $push: { waitingList: req.user._id }
          }
        );
      }
    })
    .then(() => res.redirect(`/encounter/single/${eventId}`))
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//post methods
//create event
router.post('/create', routeGuard, (req, res, next) => {
  const { eventName, lat, lng, date, numberOfPlayer, gameList } = req.body;
  Event.create({
    eventName,
    host: req.user._id,
    location: {
      coordinates: [lat, lng]
    },
    date,
    numberOfPlayer,
    gameList,
    waitingList: [req.user._id]
  })
    .then(() => res.redirect('/encounter'))
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//delete event
router.post('/single/:id/delete', routeGuard, (req, res, next) => {
  Event.findByIdAndRemove(req.params.id)
    .then(() => res.redirect('/encounter'))
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//edit event
router.post('/single/:id/edit', routeGuard, (req, res, next) => {
  const id = req.params.id;
  const { eventName, lat, lng, date, numberOfPlayer, gameList } = req.body;
  Event.findByIdAndUpdate(
    id,
    {
      eventName,
      location: {
        coordinates: [lat, lng]
      },
      date,
      numberOfPlayer,
      gameList
    },
    { runValidators: true }
  )
    .then(event => {
      Event.findById(id)
        .populate('host')
        .then(() => res.redirect(`/encounter/single/${id}`));
    })
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//insert the comment on the event. the id come on the query
router.post('/single/addComment', routeGuard, (req, res, next) => {
  const player = req.user.name;
  const { comment } = req.body;
  Event.findByIdAndUpdate(
    {
      _id: req.query.event_id
    },
    {
      $push: { comments: { player, comment } }
    },
    { new: true }
  )
    .then(() => res.redirect(`/encounter/single/${req.query.event_id}`))
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//delete player from event
router.post('/single/:id/deletePlayer', routeGuard, (req, res, next) => {
  Event.update(
    {
      _id: req.params.id
    },
    { $pull: { waitingList: req.user.id } },
    { multi: true }
  )
    .then(encounter => {
      res.redirect(`/encounter/single/${req.params.id}`);
    })
    .catch(error => {
      console.log(error);
      next(error);
    });
});

//delete the comment on the event, it is coming back
router.post('/single/:id/deleteComment', routeGuard, (req, res, next) => {
  Event.update({}, { $pull: { comments: { _id: req.params.id } } }, { multi: true })
    .then(() => res.redirect('/encounter'))
    .catch(error => {
      console.log(error);
      next(error);
    });
});

module.exports = router;
