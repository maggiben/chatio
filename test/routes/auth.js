process.env.PORT = 8080
process.env.NODE_ENV = 'test'

var conf = require('../../config')
    , server = require('../../app')
    , supertest = require('supertest')
    , request = supertest(server)
    , expect = require('chai').expect
    , Account = require('../../models/account')

describe('Auth', function(){
    before(function(done){
        var user = new Account({username: 'ariel', email: 'ariel@gmail.com'});
        user.setPassword('password', function(error) {
            user.save(function(error, user) {
                done();
            });
        });
    })


    it('should not authenticate invalid credentials', function(done){
        request
            .post('/user/signin')
            .send({username:'ariel', password:'badPassword'})
            .expect(401)
            .end(done);
    });

    it('should authenticate valid credentials', function(done){
        request
            .post('/user/signin')
            .send({username: 'ariel', password: 'password'})
            .expect(200)
            .end(function(err, res){
                  if (err) return done(err);
                  expect(res.body).to.have.property('token');
                  done();
            });
    });

    it('should log out', function(done){
            request
                .post('/user/signin')
                .send({username: 'ariel', password: 'password'})
                .expect(200)
                .end(function(err, res){
                      if (err) return done(err);
                      expect(res.body).to.have.property('token');
                      var token = res.body.token.token;
                      request
                        .get('/user/signout')
                        .set('token', token)
                        .expect(200)
                        .end(function(err, res){
                            done();
                        });
                });
    });

    after(function(done){
        Account.findOneAndRemove({username: 'ariel'}, function(error, user){
            done();
        })
    });
});
