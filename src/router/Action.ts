import * as Path from 'path'
import * as fs from 'fs'
import * as express from 'express'
import { Router } from './Router'
import { Controller } from '../controller/Controller'
const PROTOCOLS = ['get', 'post', 'put', 'delete']

let localPath = Path.join(__dirname, '../../..')
if (Path.basename(localPath) === 'node_modules') {
  localPath = Path.join(localPath, '..')
}

let controllerPath: string

declare module 'express' {

  export interface Application {
    [protocol: string]: any
  }

}

export interface IActionOptions {
  router: Router
  protocol: string
  path: string
  controller?: string
  action?: string
}

export class Action {

  router: Router
  protocol: string
  _path: string
  _controller: string
  _action: string

  static get protocols() {
    return PROTOCOLS
  }

  static get localPath() {
    return localPath
  }

  static get controllerPath() {
    if (controllerPath) return controllerPath
    if (fs.existsSync(Path.join(this.localPath, 'controllers'))) {
      return controllerPath = Path.join(this.localPath, 'controllers')
    }
    if (fs.existsSync(Path.join(this.localPath, 'dist/controllers'))) {
      return controllerPath = Path.join(this.localPath, 'dist/controllers')
    }
    if (fs.existsSync(Path.join(this.localPath, 'src/controllers'))) {
      return controllerPath = Path.join(this.localPath, 'src/controllers')
    }
    throw 'cannot find controller directory'
  }

  constructor({router, path, protocol, controller, action}: IActionOptions) {
    this.protocol = protocol
    this.router = router
    this._path = Router.trimSlash(path)
    this._controller = controller
    this._action = action
  }

  get action() {
    if (this._action) return this._action
    if (this._path.match(/^\w+$/)) return this._path
  }

  get controller() {
    const controller = this._controller || this.router.controllerName
    if (controller) return controller
    throw `${this.path} action missing controller`
  }

  get as() {
    return `${this.controller}#${this.action}`
  }

  get path() {
    let path = this.router.path
    if (path && this._path) path += '/'
    return path + this._path
  }

  get url() {
    return '/' + this.path
  }

  get Controller() {
    let Controller

    try {
      Controller = require(Path.join(Action.controllerPath, this.controller + 'Controller'))
    } catch {
      try {
        Controller = require(Path.join(Action.controllerPath, this.controller))
      } catch (error) {
        throw error
      }
    }

    if (typeof Controller === 'function') return Controller
    if (Controller[this.controller + 'Controller']) return Controller[this.controller + 'Controller']
    if (Controller[this.controller]) return Controller[this.controller]
    throw 'the imported controller does not seem to be an controller'
  }

  get errors() {
    return Controller.filter(this.Controller.inheritedErrors, this.action).map(([error, options]) => error.name).join(', ')
  }

  launchOn(application: express.Application) {
    application[this.protocol](this.url, ...this.Controller.middlewares(this.action))
  }
}
