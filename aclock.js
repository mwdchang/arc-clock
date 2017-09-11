'use strict';

class ArcClock {

  constructor(config) {
    config = config || {};
    let defaultConfig = this.getDefaultConfig();

    Object.keys(defaultConfig).forEach(function(key) {
      if (!config.hasOwnProperty(key)) {
        config[key] = defaultConfig[key];
      }
    });
    
    this.config = config;

    // Might as well figure out the actual dimension since they won't change
    var max = d3.max([
      config.centerRadius,
      config.hourInner,
      config.hourOuter,
      config.minuteInner,
      config.minuteOuter,
      config.secondInner,
      config.secondOuter,
      config.waveInner + config.waveHeight,
      config.waveOuter + config.waveHeight
    ])

    this.width = 2.0 * max + 0.15*max;
    this.height = 2.0 * max + 0.15*max;
  }


  getDefaultConfig() {
    return {
      // Distances, calculated as units away from the center
      centerRadius: 90,
      hourInner: 100,
      hourOuter: 120,
      minuteInner: 140,
      minuteOuter: 160,
      secondInner: 180,
      secondOuter: 200,
      waveInner: 220,
      waveOuter: 240,
      waveHeight: 35,

      // Visibility
      showHour: true,
      showMinute: true,
      showSecond: true,
      showWave: true,
      showCenter: true,

      // Style
      hourStyle: 'ENCLOSURE',
      minuteStyle: 'ENCLOSURE',
      secondStyle: 'ENCLOSURE',

      // Colour
      centerColour: '#333',
      centerTextColour: '#DDD',
      hourColour: '#369',
      minuteColour: '#69C',
      secondColour: '#9CF',
      waveColour: '#9CF',

      // Number of waves
      waves: 3,

      // Opacity of hour, minute, second
      opacity: 1.0
    }
  }


  render(id) {
    let svg, center;
    let arcSecond, arcMinute, arcHour;
    let config = this.config;


    svg = d3.select(id).append('svg')
      .attr('viewBox', '0 0 ' + this.width + ' ' + this.height)
      .attr('preserveAspectRatio', 'xMidYMid')
      .append('g')
      .attr('transform', 'translate(' + 0.5*this.width+ ',' + 0.5*this.height+ ')');

    center =  svg.append('g');


    arcSecond = d3.arc()
      .innerRadius(config.secondInner)
      .outerRadius(config.secondOuter)
      .cornerRadius(3);

    arcMinute = d3.arc()
      .innerRadius(config.minuteInner)
      .outerRadius(config.minuteOuter)
      .cornerRadius(3);

    arcHour = d3.arc()
      .innerRadius(config.hourInner)
      .outerRadius(config.hourOuter)
      .cornerRadius(3);


    let hours = svg.append('path')
      .datum({ startAngle: 0, endAngle: 0.0001 })
      .attr('d', arcHour).style('fill', config.hourColour).style('opacity', config.opacity);

    let minutes = svg.append('path')
      .datum({ startAngle: 0, endAngle: 0.0001 })
      .attr('d', arcMinute).style('fill', config.minuteColour).style('opacity', config.opacity);

    let seconds = svg.append('path')
      .datum({ startAngle: 0, endAngle: 0.0001 })
      .attr('d', arcSecond).style('fill', config.secondColour).style('opacity', config.opacity);



    function seconds2Radians(s) {
      return 2 * s / 60 * Math.PI;
    }

    function minutes2Radians(s) {
      return 2 * s / 3600 * Math.PI;
    }

    function hours2Radians(s) {
      return 2 * s / (12*3600) * Math.PI;
    }

    function renderWave() {
      for (let i=0; i < 60; i++) {
        let _secodnStart = seconds2Radians(i);
        let arc = d3.arc()
          .innerRadius(config.waveInner)
          .outerRadius(config.waveOuter + config.waveHeight*Math.abs(Math.cos(Math.PI*i/ (60/config.waves) ) ))
          .startAngle( seconds2Radians( (i-0.43)%60))
          .endAngle( seconds2Radians( (i+0.43)%60));

        svg.append('path')
          .datum({val: i})
          .attr('class', 'sec')
          .attr('d', arc).style('fill', config.waveColour).style('opacity', 0.15);
      }
    }


    function arcTween(transition, start, type, style) {
      transition.attrTween('d', function(d) {
        let interpolator, gap;
        if (type === 'H') {
          interpolator = d3.interpolate(start, start + hours2Radians(1));
          gap = hours2Radians(60*30);
        } else if (type === 'M')  {
          interpolator = d3.interpolate(start, start + minutes2Radians(1));
          gap = minutes2Radians(30);
        } else if (type === 'S') {
          interpolator = d3.interpolate(start, start + seconds2Radians(1));
          gap = seconds2Radians(0.5);
        }

        return function(t) {
          if (style === 'ARC') {
            d.statAngle = 0;
            d.endAngle = interpolator(t);
          } else if (style == 'ENCLOSURE') {
            d.startAngle = interpolator(t) + gap;
            d.endAngle = interpolator(t) + 2*Math.PI - gap;
          } else {
            d.startAngle = interpolator(t);
            d.endAngle = interpolator(t) + 2*gap;
          }

          if (type === 'H') return arcHour(d);
          if (type === "M") return arcMinute(d);
          return arcSecond(d);
        };
      });
    }

    function nextTick() {
      let now = new Date();
      let _seconds = now.getSeconds();
      let _minutes = now.getMinutes();
      let _hours = now.getHours() % 12;

      if (_seconds === 0) _seconds += 0.001;
      if (_minutes === 0) _minutes += 0.00001;
      if (_hours === 0) _hours += 0.0000001;

      let _secondsStart = seconds2Radians((_seconds-1)%60);
      let _minutesStart = minutes2Radians(_minutes*60 + _seconds);
      let _hoursStart = hours2Radians(_hours * 60*60 + _minutes*60 + _seconds);

      let dateStr = (_hours < 10? '0' + _hours : _hours) + ':' +
        (now.getMinutes() < 10? '0' + now.getMinutes() : now.getMinutes()) + ':' +
        (now.getSeconds() < 10? '0' + now.getSeconds() : now.getSeconds());

      if (now.getSeconds() === 0) {
        svg.selectAll('.sec').style('opacity', 0.05);
      }
      svg.selectAll('.sec').filter(function(d) {
        return d.val <= _seconds;
      }).transition().duration(300).style('opacity', 1.0);

      if (config.showSecond) {
        seconds.style('visibility', 'visible');
      } else {
        seconds.style('visibility', 'hidden');
      }
      if (config.showMinute) {
        minutes.style('visibility', 'visible');
      } else {
        minutes.style('visibility', 'hidden');
      }
      if (config.showHour) {
        hours.style('visiblity', 'visible');
      } else {
        hours.style('visiblity', 'hidden');
      }

      if (config.showCenter) {
        center.style('visibility', 'visible');
      } else {
        center.style('visibility', 'hidden');
      }

      if (config.showWave) {
        svg.selectAll('.sec').style('visibility', 'visible');
      } else {
        svg.selectAll('.sec').style('visibility', 'hidden');
      }

      seconds.transition().duration(300)
        .call(arcTween, _secondsStart, 'S', config.secondStyle);

      minutes.transition().duration(300)
        .call(arcTween, _minutesStart, 'M', config.minuteStyle);

      hours.transition().duration(300)
        .call(arcTween, _hoursStart, "H", config.hourStyle);

      center.select('text').text(dateStr);
    }


    // Start rendering
    renderWave();
    center.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', config.centerRadius)
      .style('fill', config.centerColour);

    center.append('text')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .style('fill', config.centerTextColour)
      .style('font-family', 'Tahoma');

     // Start
    nextTick();
    setInterval(nextTick, 1000);
  }



}






