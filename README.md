# Behringer IEM Remote

## What is this?

This is a websockets based remote control for behringer buses. Suitable for IEM usage.

In short, it allows performers to tweak their own mix on their dedicated AUX/BUS using nothing more than a phone. They don't need to install anything, and the sound engineer doesn't need to worry about accidentally giving them too much access to say front-of-house speakers.

![Example](https://github.com/nebev/behringer-xr-pi-remote/blob/master/docs/example.png?raw=true)
![Example](https://github.com/nebev/behringer-xr-pi-remote/blob/master/docs/example-2.png?raw=true)
![Bus Overview](https://github.com/nebev/behringer-xr-pi-remote/blob/master/docs/bus-overview.png?raw=true)


While in theory this should work on XR12/XR16/XR18/X32, I only have an XR18. Your mileage may vary.

This was also written very quickly. Don't expect it to be bug-free. If you find a bug, raise an issue (or even better submit a pull request with a fix).

## Motivation

Sound for in-ears and monitors can be tricky with Behringer equipment. Without utilities like this, you really only have 2 options

**1. A sound person does mixing for all monitor speakers or in-ears.**

This sounds good in theory, but what has happened in my experience is:

* Sound person configures a bad mix
* Sound check and real performance differs significantly (people like to change their volume)
* You try and get the attention of the sound person, who is on their phone most of the concert
* You can't hear yourself, or the levels are just wrong

**2. You give performers access to the Behringer Application**

Also good in theory, but:

* Performers might not have compatible devices (eg. New iOS devices, old Android devices)
* Performers unintentionally (or intentionally) tweak Front-of-house sound, instead of their bus
* Performers can unintentionally or intentionally change other settings (EQ, Gain etc)
* Performers need to install an app, and there may be no internet access there

## Setup

### Audio

This application works on the XR _bus_ or _AUX_ outputs. It does **not** control front-of-house levels. Normally each bus goes to a different performer and is either a monitor speaker or a set of in-ears (eg. like the [Behringer P2](https://www.behringer.com/product.html?modelCode=P0CH4)). An example setup might look like this:

![Audio Overview](https://github.com/nebev/behringer-xr-pi-remote/blob/master/docs/audio-overview.png?raw=true)

### Network

You need a network in order to use this utility. While the XR series mixers do have built-in wifi routers, they are notoriously bad and shouldn't be used. Most people opt for a standalone router and use that. I recommend using the **5ghz** frequency, as the 2.4ghz frequency gets pretty crowded as it shares the spectrum with other wifi networks, wireless mics, microwaves etc.

This application runs on a **computer**. The computer can be a Mac, PC, or Linux box. I personally like to use a [Raspberry Pi](https://en.wikipedia.org/wiki/Raspberry_Pi) with a case, because it's small and easily transportable. However it doesn't come with a screen, and if you're not comfortable with that, then you should stick to a laptop.

![Network Overview](https://github.com/nebev/behringer-xr-pi-remote/blob/master/docs/network-overview.png?raw=true)

#### Static IP Addresses

When it comes to networks for gigging, I recommend setting everything up using Static IPs. This means the IP address of your Mixer, Computer etc will _always stay the same_. eg. My XR18 _always_ is 192.168.1.5. No matter where I set up for a gig, it always gets this address.

Every router has a different way of setting up static IPs, but if you look up "<your router model> DHCP reservation" you will probably find a decent guide.

## Running this application

Pop over to the [Releases](https://github.com/nebev/behringer-xr-pi-remote/releases) page to download the latest release for your operating system. All you need to do is to double-click the application. No install is necessary.

Once you run the application, it will ask you for the IP address of the Behringer Mixer. Put it in and press enter.

The application will tell you where you can access it via a set of URLs. It will also output a QR code which you can scan with your phone if you like.

![Start Up](https://github.com/nebev/behringer-xr-pi-remote/blob/master/docs/startup.png?raw=true)

If you don't want to manually enter the IP address of the mixer every time, you can take a look at the `config.example.json` file in this directory and move it to your home directory and call it `behringer-remote.json`

### Running using Docker

* Clone this repository
* Install [docker-compose](https://github.com/docker/compose) for your operating system
* Change directory to this repository
* Create a `config.json` file at the root of the directory with contents similar to the provided `config.example.json`
  * This contains your mixer's IP and Port, since you won't have an keyboard available to put in this information
* Run `docker-compose up -d`

You can view logs of the process by running `docker-compose logs -f` (Ctrl-C will detach)

The container is set to restart automatically upon crash and on system restart. If the mixer IP is unavailable it should (in theory) crash, then restart.

### Firewall

If your machine asks about a firewall, it's crucial that you _allow_ the machine to receive connections. If you don't allow this, your devices will not be able to connect to it.

# Development

This uses a standard Node18 project. Clone the repository and run `yarn` then `yarn dev`

# License / Usage

See the `LICENSE`, but this is MIT licensed.

There is ABSOLUTELY NO WARRANTY. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

**If you blow your speakers/headphones using this software (even as the result of a bug), this is on you. USE AT YOUR OWN RISK.**