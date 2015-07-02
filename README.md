## ChatIo [ [![Build Status](https://travis-ci.org/maggiben/chatio.svg?branch=master)](https://travis-ci.org/maggiben/chatio) [![Coverage Status](https://coveralls.io/repos/maggiben/chatio/badge.svg)](https://coveralls.io/r/maggiben/chatio) [![Dependency Status](https://gemnasium.com/maggiben/chatio.svg)](https://gemnasium.com/maggiben/chatio) [![Code Climate](https://codeclimate.com/repos/5594f28b69568062c002444f/badges/0495d29bd5193aec95bf/gpa.svg)](https://codeclimate.com/repos/5594f28b69568062c002444f/feed) ]

## Quick Start

Install Node.js and then:

```sh
$ npm install
$ node app
```
###  Live develop
Gulp script allows to use nodemon to reload the server if files have changes

```sh
$ gulp develop
```
###  Test suire
There are many ways to test the code, the purpose of having two different test setups has to do with CI and CD
`gulp mocha` though installed is not supported at this time due to the fact that gulp-mocha cant pass environment variables to node, therefore only one state can be enabled for the application and that could potentially damage the primary DB.
By setting up different test environments (localhost, production, staging, qa) one could potentially engage different build/test conditions (not available as of v0.2)

To test the code in any enviroment use: (uses clean test database)
```sh
$ npm test
```
