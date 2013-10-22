(function(exports) {

  // locate or create the parks global namespace
  var ggnpc = exports.GGNPC || (exports.GGNPC = {}),
      ui = ggnpc.ui || (ggnpc.ui = {});

  ui.calendar = function() {
    var startDay = d3.functor(0), // Sunday
        date = d3.functor(new Date()),
        dowFormat = (function(fmt) {
          return function(d) {
            return fmt(d).charAt(0);
          };
        })(d3.time.format("%a")),
        dateFormat = d3.time.format("%e");

    function calendar(selection) {
      selection.each(function() {

        var now = date.apply(this, arguments);
        if (!now) return;

        var that = d3.select(this);

        var thead = that.select("thead tr");
        if (thead.empty()) {
          thead = that.append("thead")
            .append("tr");
        }

        var tbody = that.select("tbody");
        if (tbody.empty()) {
          tbody = that.append("tbody");
        }

        var startDow = startDay.apply(this, arguments) || 0,
            weeks = ui.calendar.weeks(now, startDow);

        var th = thead.selectAll("th.dow")
          .data(weeks[0]);
        th.exit().remove();
        th.enter().append("th")
          .attr("class", "dow");
        th.text(dowFormat);

        var tr = tbody.selectAll("tr.week")
          .data(weeks);
        tr.exit().remove();
        tr.enter().append("tr")
          .attr("class", "week");

        var td = tr.selectAll("td.day")
          .data(function(d) { return d; });
        td.exit().remove();
        td.enter().append("td")
          .attr("class", "day");

        td.text(dateFormat);
      });
    }

    calendar.date = function(d) {
      if (!arguments.length) return date;
      date = d3.functor(d);
      return calendar;
    };

    calendar.startDay = function(index) {
      if (!arguments.length) return startDay;
      startDay = d3.functor(index);
      return calendar;
    };

    calendar.dowFormat = function(fmt) {
      if (!arguments.length) return dowFormat;
      dowFormat = (typeof fmt === "string")
        ? d3.time.format(fmt)
        : d3.functor(fmt);
      return calendar;
    };

    calendar.dateFormat = function(fmt) {
      if (!arguments.length) return dateFormat;
      dateFormat = (typeof fmt === "string")
        ? d3.time.format(fmt)
        : d3.functor(fmt);
      return calendar;
    };

    return calendar;
  };

  ui.calendar.weeks = function(now, startDow) {
    var year = now.getFullYear(),
        month = now.getMonth(),
        firstMonthDay = new Date(year, month, 1),
        firstDay = d3.time.day.offset(firstMonthDay, startDow - firstMonthDay.getDay()),
        firstWeek = d3.time.day.range(firstDay, d3.time.day.offset(firstDay, 7)),
        weeks = [firstWeek];

    while (!isNextMonth(weeks[weeks.length - 1][6])) {
      var firstDayWeek = d3.time.day.offset(weeks[weeks.length - 1][6], 1);
      if (isNextMonth(firstDayWeek)) break;
      var week = d3.time.day.range(firstDayWeek, d3.time.day.offset(firstDayWeek, 7));
      weeks.push(week);
    }

    function isNextMonth(d) {
      return d.getFullYear() > year || d.getMonth() > month;
    }

    return weeks;
  };

  ui.datePicker = function() {
    var dispatch = d3.dispatch("day", "month"),
        changeMonths = true,
        selectToday = true,
        todayFormat = d3.time.format("Today: %b. %e, %Y"),
        month = new Date(),
        selected = null,
        calendar = ui.calendar(),
        monthFormat = d3.time.format("%b. %Y");
    
    function picker(selection) {
      selection
        .call(calendar);

      var caption = selection.select("caption");
      if (changeMonths) {
        if (caption.empty()) {
          caption = selection.insert("caption", "head");
          caption.append("span")
            .attr("class", "month");
          caption.selectAll("button.offset")
            .data([
              {off: -1, html: "&lt;"},
              {off: +1, html: "&gt;"},
            ])
            .enter()
            .append("a")
              .attr("class", function(d) {
                return [
                  "offset",
                  d.off < 0 ? "prev" : "next"
                ].join(" ");
              })
              .html(function(d) { return d.html; })
              .on("click", function(d) {
                d3.event.preventDefault();
                var offset = d3.time.month.offset(month, d.off);
                dispatch.month(offset, this);
              });
        }
      } else {
        if (!caption.empty()) caption.remove();
      }

      selection.select("caption .month")
        .text(monthFormat(month));

      var tfoot = selection.select("tfoot tr td");
      if (selectToday) {
        if (tfoot.empty()) {
          tfoot = selection.append("tfoot")
            .append("tr")
              .append("td")
                .attr("colspan", 7);

          tfoot.append("a")
            .attr("class", "today")
            .datum(d3.time.day.floor(new Date()))
            .text(todayFormat)
            .on("click", function(d) {
              d3.event.preventDefault();
              dispatch.day(d, this);
            });
        }
      }

      var monthStart = d3.time.month.floor(month),
          monthEnd = d3.time.month.ceil(month);

      var cell = selection.selectAll("td.day")
        .classed("current", function(d) {
          return d >= monthStart && d < monthEnd;
        })
        .classed("selected", selected
          ? function(d) {
            return d === d3.time.day.floor(selected);
          }
          : false)
        .on("click", dispatch.day);
    }

    picker.day = function(d) {
      if (!arguments.length) return selected;
      selected = d;
      return picker;
    };

    picker.month = function(d) {
      if (!arguments.length) return month;
      calendar.date(month = d);
      return picker;
    };

    return d3.rebind(picker, dispatch, "on");
  };

})(this);
